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

import {
  lireMetriques,
  lireObjets,
  lirePosesTexte,
  lireRessources,
  type MetriquePolice,
  type PoseTexte,
} from "./pdf-objets";

export type { MetriquePolice, PoseTexte } from "./pdf-objets";

const executer = promisify(execFile);

/** 1 point PostScript = 1/72 pouce. */
const PT_EN_MM = 25.4 / 72;

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
    const objets = lireObjets(octets);
    const polices = lireMetriques(objets);
    const ressources = lireRessources(objets);
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
