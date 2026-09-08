/**
 * Lecture d'un BAT — géométrie, typographie et texte.
 *
 * Les BAT des Jardins de Gaïa sont des PDF d'impression Illustrator. Ils
 * portent bien plus que du texte : la zone de coupe, le corps exact de chaque
 * mot, le nom réel des polices embarquées et leurs métriques. La conformité
 * typographique de PRO-QHS-013 §12 et §4 s'en déduit par le calcul, là où elle
 * était jusqu'ici « à vérifier à l'œil ».
 *
 * Deux sources, chacune pour ce qu'elle fait le mieux :
 *   - **poppler** (`pdftotext -bbox`) pour le texte Unicode et les boîtes. Vingt
 *     ans de travail sur les encodages, les CMap et les ligatures — pas quelque
 *     chose qu'on réécrit.
 *   - **le flux de contenu**, lu directement, pour le corps EXACT. Les
 *     convertisseurs arrondissent : `pdftohtml` annonce 11 là où le flux dit 7.
 *     Pour un seuil au centième de millimètre, l'arrondi n'est pas acceptable.
 *
 * Remplace `pdf2json`, qui perdait des glyphes — le « M » de « Malin comme un
 * chimpanzé » était absent de nos extractions alors qu'il est bien dans le
 * fichier — et ne donnait ni le nom réel des polices ni les corps.
 */

import { execFile } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { inflateSync } from "zlib";

const executer = promisify(execFile);

/** 1 point PostScript = 1/72 pouce. */
const PT_EN_MM = 25.4 / 72;

export interface MetriquePolice {
  /** Nom sans le préfixe de sous-ensemble Illustrator (« GLHMDQ+ »). */
  nom: string;
  /** Hauteur de x en millièmes de cadratin, telle que déclarée par le PDF. */
  xHeight: number;
  /** Hauteur de capitale, quand la police la déclare. */
  capHeight: number | null;
}

export interface MotBat {
  texte: string;
  /** Boîte englobante en points, origine en haut à gauche (convention poppler). */
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  /** Corps en points, lu dans le flux de contenu. Null si non rattaché. */
  corpsPt: number | null;
  /** Nom de la police, sans préfixe de sous-ensemble. Null si non rattaché. */
  police: string | null;
}

export interface PageBat {
  largeurPt: number;
  hauteurPt: number;
  /** Zone de coupe — la face finie, hors fond perdu. Null si le PDF n'en a pas. */
  coupe: { largeurMm: number; hauteurMm: number; surfaceCm2: number } | null;
  mots: MotBat[];
}

export interface AnalyseBat {
  pages: PageBat[];
  /** Métriques par nom de police, sans préfixe de sous-ensemble. */
  polices: Record<string, MetriquePolice>;
  /** Texte complet, pages séparées par une ligne vide. */
  texte: string;
}

/** Retire le préfixe de sous-ensemble « ABCDEF+ » posé par Illustrator. */
function nomPolice(brut: string): string {
  return brut.replace(/^[A-Z]{6}\+/, "");
}

/**
 * Corps et police posés par le flux de contenu.
 *
 * Illustrator écrit `/T1_1 1 Tf` puis `7 0 0 7 x y Tm` : la taille vaut 1 et
 * l'échelle réelle est portée par la matrice. On multiplie les deux, et on
 * retient la position pour rattacher le style au mot correspondant.
 */
interface PoseTexte {
  ressource: string;
  corpsPt: number;
  x: number;
  y: number;
  /** Rotation en degrés. Le code étiquette JDG est posé à 90°. */
  rotation: number;
}

type Matrice = [number, number, number, number, number, number];

const IDENTITE: Matrice = [1, 0, 0, 1, 0, 0];

/** Produit matriciel PDF : m1 × m2. */
function multiplier(m1: Matrice, m2: Matrice): Matrice {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + b1 * c2,
    a1 * b2 + b1 * d2,
    c1 * a2 + d1 * c2,
    c1 * b2 + d1 * d2,
    e1 * a2 + f1 * c2 + e2,
    e1 * b2 + f1 * d2 + f2,
  ];
}

/**
 * Interprète l'état de texte du flux de contenu.
 *
 * Un paragraphe ne repose pas un `Tm` à chaque ligne : il en pose un au début
 * puis avance avec `Td`, `TD` ou `T*`. Chercher les `Tm` au motif ne voyait donc
 * qu'une ligne sur trois. Il faut suivre l'état comme le ferait un moteur de
 * rendu — matrice de texte, matrice de ligne, interligne — et n'émettre une pose
 * qu'au moment où du texte est réellement montré.
 */
function lirePosesTexte(pdf: Buffer): PoseTexte[] {
  const poses: PoseTexte[] = [];
  const brut = pdf.toString("latin1");
  const marqueur = /stream\r?\n/g;
  let m: RegExpExecArray | null;

  while ((m = marqueur.exec(brut)) !== null) {
    const debut = m.index + m[0].length;
    const fin = pdf.indexOf("endstream", debut);
    if (fin < 0) continue;

    let contenu: string;
    try {
      contenu = inflateSync(pdf.subarray(debut, fin)).toString("latin1");
    } catch {
      continue; // flux non compressé, image ou police — pas du contenu de page
    }
    if (!contenu.includes(" Tf")) continue;

    let tm: Matrice = IDENTITE;
    let tlm: Matrice = IDENTITE;
    let interligne = 0;
    let ressource: string | null = null;
    let taille = 1;

    const N = "(-?[\\d.]+)";
    const operateurs = new RegExp(
      [
        `\\/(\\S+)\\s+${N}\\s+Tf`,                                   // 1,2   police
        `${N}\\s+${N}\\s+${N}\\s+${N}\\s+${N}\\s+${N}\\s+Tm`,    // 3..8  matrice
        `${N}\\s+${N}\\s+(TD|Td)`,                                       // 9,10,11 déplacement
        `${N}\\s+TL`,                                                      // 12    interligne
        `(T\\*)`,                                                          // 13    ligne suivante
        `(BT|ET)`,                                                           // 14    bloc de texte
        `(Tj|TJ|'|")`,                                                       // 15    texte montré
      ].join("|"),
      "g"
    );

    let o: RegExpExecArray | null;
    while ((o = operateurs.exec(contenu)) !== null) {
      if (o[1] !== undefined) {
        ressource = o[1];
        taille = Number(o[2]);
      } else if (o[3] !== undefined) {
        tm = tlm = [Number(o[3]), Number(o[4]), Number(o[5]), Number(o[6]), Number(o[7]), Number(o[8])];
      } else if (o[9] !== undefined) {
        const tx = Number(o[9]);
        const ty = Number(o[10]);
        if (o[11] === "TD") interligne = -ty;
        tlm = multiplier([1, 0, 0, 1, tx, ty], tlm);
        tm = tlm;
      } else if (o[12] !== undefined) {
        interligne = Number(o[12]);
      } else if (o[13] !== undefined) {
        tlm = multiplier([1, 0, 0, 1, 0, -interligne], tlm);
        tm = tlm;
      } else if (o[14] !== undefined) {
        if (o[14] === "BT") tm = tlm = IDENTITE;
      } else if (o[15] !== undefined && ressource) {
        // `'` et `"` passent d'abord à la ligne suivante.
        if (o[15] === "'" || o[15] === '"') {
          tlm = multiplier([1, 0, 0, 1, 0, -interligne], tlm);
          tm = tlm;
        }
        const [a, b] = tm;
        poses.push({
          ressource,
          corpsPt: Number((Math.hypot(a, b) * taille).toFixed(3)),
          x: tm[4],
          y: tm[5],
          rotation: Math.round((Math.atan2(b, a) * 180) / Math.PI),
        });
      }
    }
  }
  return poses;
}

/** Métriques des polices embarquées, déclarées en clair dans les descripteurs. */
function lireMetriques(pdf: Buffer): Record<string, MetriquePolice> {
  const texte = pdf.toString("latin1");
  const polices: Record<string, MetriquePolice> = {};
  const bloc = /\/FontName\s*\/([A-Za-z0-9+\-.]+)([\s\S]{0,800}?)\/XHeight\s+(-?\d+)/g;
  let m: RegExpExecArray | null;

  while ((m = bloc.exec(texte)) !== null) {
    const nom = nomPolice(m[1]);
    const cap = /\/CapHeight\s+(-?\d+)/.exec(m[0]);
    polices[nom] = {
      nom,
      xHeight: Number(m[3]),
      capHeight: cap ? Number(cap[1]) : null,
    };
  }
  return polices;
}

/**
 * Rattache un corps et une police à chaque mot, par proximité de position.
 *
 * L'origine du texte posée par `Tm` coïncide avec le bord gauche du premier mot
 * de sa ligne : on retient la pose la plus proche horizontalement, à hauteur de
 * ligne compatible. Un mot sans pose trouvée garde `null` — on préfère l'absence
 * à une valeur inventée, un contrôle typographique n'ayant aucun droit à
 * l'approximation.
 */
function rattacherStyle(
  mots: MotBat[],
  poses: PoseTexte[],
  hauteurPage: number,
  ressources: Record<string, string>
): void {
  for (const mot of mots) {
    // Un texte pivoté produit une boîte plus haute que large : on ne rattache
    // une pose tournée qu'à ce genre de mot, sinon le code étiquette posé à 90°
    // vient voler son corps au poids net qui passe à côté.
    const motPivote = mot.hauteur > mot.largeur * 1.5;
    // poppler compte depuis le haut, le PDF depuis le bas.
    const basePdf = hauteurPage - (mot.y + mot.hauteur);

    let meilleure: PoseTexte | null = null;
    let meilleurEcart = Infinity;

    for (const pose of poses) {
      const posePivotee = Math.abs(pose.rotation) > 20;
      if (posePivotee !== motPivote) continue;

      // La ligne de base doit correspondre, à une fraction du corps près.
      const dy = Math.abs(pose.y - basePdf);
      if (dy > 0.45 * pose.corpsPt) continue;

      // La pose ouvre la ligne : elle commence au plus tard au mot.
      const dx = mot.x - pose.x;
      if (dx < -0.5) continue;

      const ecart = dx + dy * 20;
      if (ecart < meilleurEcart) {
        meilleurEcart = ecart;
        meilleure = pose;
      }
    }

    if (meilleure) {
      mot.corpsPt = meilleure.corpsPt;
      mot.police = ressources[meilleure.ressource] ?? null;
    }
  }
}

/** Table ressource (`T1_0`) → nom de police, lue dans le dictionnaire de la page. */
function lireRessources(pdf: Buffer): Record<string, string> {
  const texte = pdf.toString("latin1");
  const table: Record<string, string> = {};
  const paires = /\/(T1_\d+|TT\d+|F\d+)\s+(\d+)\s+\d+\s+R/g;
  const objets = new Map<string, string>();

  const definitions = /(\d+)\s+\d+\s+obj([\s\S]{0,600}?)\/BaseFont\s*\/([A-Za-z0-9+\-.]+)/g;
  let d: RegExpExecArray | null;
  while ((d = definitions.exec(texte)) !== null) {
    objets.set(d[1], nomPolice(d[3]));
  }

  let p: RegExpExecArray | null;
  while ((p = paires.exec(texte)) !== null) {
    const nom = objets.get(p[2]);
    if (nom) table[p[1]] = nom;
  }
  return table;
}

/** Analyse XML de `pdftotext -bbox` : pages et mots avec leurs boîtes. */
function lireBoites(xml: string): { pages: { largeur: number; hauteur: number; mots: MotBat[] }[] } {
  const pages: { largeur: number; hauteur: number; mots: MotBat[] }[] = [];
  const blocs = /<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g;
  let b: RegExpExecArray | null;

  while ((b = blocs.exec(xml)) !== null) {
    const mots: MotBat[] = [];
    const motif = /<word xMin="([\d.-]+)" yMin="([\d.-]+)" xMax="([\d.-]+)" yMax="([\d.-]+)">([\s\S]*?)<\/word>/g;
    let w: RegExpExecArray | null;
    while ((w = motif.exec(b[3])) !== null) {
      const x = Number(w[1]);
      const y = Number(w[2]);
      mots.push({
        texte: w[5]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'"),
        x,
        y,
        largeur: Number(w[3]) - x,
        hauteur: Number(w[4]) - y,
        corpsPt: null,
        police: null,
      });
    }
    pages.push({ largeur: Number(b[1]), hauteur: Number(b[2]), mots });
  }
  return { pages };
}

/** Zone de coupe par page, via `pdfinfo -box`. */
async function lireCoupe(chemin: string, page: number): Promise<PageBat["coupe"]> {
  try {
    const { stdout } = await executer("pdfinfo", ["-box", "-f", String(page), "-l", String(page), chemin]);
    const m = /TrimBox:\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/.exec(stdout);
    if (!m) return null;
    const largeurMm = (Number(m[3]) - Number(m[1])) * PT_EN_MM;
    const hauteurMm = (Number(m[4]) - Number(m[2])) * PT_EN_MM;
    return {
      largeurMm: Number(largeurMm.toFixed(2)),
      hauteurMm: Number(hauteurMm.toFixed(2)),
      surfaceCm2: Number(((largeurMm * hauteurMm) / 100).toFixed(2)),
    };
  } catch {
    return null;
  }
}

/**
 * Lit un BAT : texte, boîtes, corps exacts, polices et zone de coupe.
 * Lève si poppler est absent ou si le fichier n'est pas un PDF lisible.
 */
export async function analyserBat(buffer: ArrayBuffer | Uint8Array): Promise<AnalyseBat> {
  const octets = Buffer.from(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
  const dossier = await mkdtemp(join(tmpdir(), "bat-"));
  const chemin = join(dossier, "bat.pdf");

  try {
    await writeFile(chemin, octets);
    const { stdout: xml } = await executer("pdftotext", ["-bbox", chemin, "-"], {
      maxBuffer: 32 * 1024 * 1024,
    });

    const { pages: brutes } = lireBoites(xml);
    const polices = lireMetriques(octets);
    const ressources = lireRessources(octets);
    const poses = lirePosesTexte(octets);

    const pages: PageBat[] = [];
    for (const [i, p] of brutes.entries()) {
      rattacherStyle(p.mots, poses, p.hauteur, ressources);
      pages.push({
        largeurPt: p.largeur,
        hauteurPt: p.hauteur,
        coupe: await lireCoupe(chemin, i + 1),
        mots: p.mots,
      });
    }

    const texte = pages.map((p) => p.mots.map((m) => m.texte).join(" ")).join("\n\n");
    return { pages, polices, texte };
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}

/**
 * Hauteur de x en millimètres, telle qu'elle sera imprimée.
 * `XHeight` est en millièmes de cadratin ; le corps est en points.
 */
export function hauteurXmm(corpsPt: number, metrique: MetriquePolice): number {
  return Number((((metrique.xHeight / 1000) * corpsPt * PT_EN_MM)).toFixed(3));
}

/** Hauteur de capitale en millimètres — celle des chiffres du poids net (§4). */
export function hauteurCapitaleMm(corpsPt: number, metrique: MetriquePolice): number | null {
  if (metrique.capHeight === null) return null;
  return Number((((metrique.capHeight / 1000) * corpsPt * PT_EN_MM)).toFixed(3));
}

/** La face la plus grande décide des seuils typographiques (§12). */
export function surfaceFaceLaPlusGrande(analyses: AnalyseBat[]): number | null {
  const surfaces = analyses
    .flatMap((a) => a.pages)
    .map((p) => p.coupe?.surfaceCm2)
    .filter((s): s is number => typeof s === "number");
  return surfaces.length > 0 ? Math.max(...surfaces) : null;
}
