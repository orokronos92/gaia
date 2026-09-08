/**
 * Lecture bas niveau d'un PDF : objets, polices, poses de texte.
 *
 * Tout ce qui suit lit le fichier tel qu'il est écrit, sans convertisseur
 * intermédiaire — les convertisseurs arrondissent, et un seuil au centième de
 * millimètre ne supporte pas l'arrondi. `pdf-bat.ts` compose ces lectures avec
 * poppler pour produire l'analyse d'un BAT.
 */

import { inflateSync } from "zlib";

export interface MetriquePolice {
  /** Nom sans le préfixe de sous-ensemble Illustrator (« GLHMDQ+ »). */
  nom: string;
  /** Hauteur de x en millièmes de cadratin, telle que déclarée par le PDF. */
  xHeight: number;
  /** Hauteur de capitale, quand la police la déclare. */
  capHeight: number | null;
}

/**
 * Corps et police posés par le flux de contenu.
 *
 * Illustrator écrit `/T1_1 1 Tf` puis `7 0 0 7 x y Tm` : la taille vaut 1 et
 * l'échelle réelle est portée par la matrice. On multiplie les deux, et on
 * retient la position pour rattacher le style au mot correspondant.
 */
export interface PoseTexte {
  ressource: string;
  corpsPt: number;
  x: number;
  y: number;
  /** Rotation en degrés. Le code étiquette JDG est posé à 90°. */
  rotation: number;
}

/** Retire le préfixe de sous-ensemble « ABCDEF+ » posé par Illustrator. */
export function nomPolice(brut: string): string {
  return brut.replace(/^[A-Z]{6}\+/, "");
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
export function lirePosesTexte(pdf: Buffer): PoseTexte[] {
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

/**
 * Tous les objets du fichier, y compris ceux rangés dans un flux d'objets.
 *
 * Depuis PDF 1.5, Illustrator peut regrouper les dictionnaires — dont les
 * descripteurs de police et les ressources de page — dans un `ObjStm`
 * compressé. Ils n'apparaissent alors nulle part en clair : lire le fichier
 * brut ne voyait qu'une partie des polices, et les mots de la face avant
 * restaient sans police rattachée donc sans mesure possible.
 *
 * Un `ObjStm` porte `/N` objets et une table de paires « numéro décalage » sur
 * ses `/First` premiers octets, les corps suivant bout à bout.
 */
export function lireObjets(pdf: Buffer): Map<string, string> {
  const brut = pdf.toString("latin1");
  const objets = new Map<string, string>();

  // Objets en clair.
  const directs = /(\d+)\s+\d+\s+obj([\s\S]*?)endobj/g;
  let d: RegExpExecArray | null;
  while ((d = directs.exec(brut)) !== null) objets.set(d[1], d[2]);

  // Objets rangés dans un flux d'objets.
  const marqueur = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = marqueur.exec(brut)) !== null) {
    const entete = brut.slice(Math.max(0, m.index - 400), m.index);
    if (!entete.includes("/ObjStm")) continue;
    const n = /\/N\s+(\d+)/.exec(entete);
    const first = /\/First\s+(\d+)/.exec(entete);
    if (!n || !first) continue;

    const debut = m.index + m[0].length;
    const fin = pdf.indexOf("endstream", debut);
    if (fin < 0) continue;

    let contenu: string;
    try {
      contenu = inflateSync(pdf.subarray(debut, fin)).toString("latin1");
    } catch {
      continue;
    }

    const table = contenu
      .slice(0, Number(first[1]))
      .trim()
      .split(/\s+/)
      .map(Number);
    const corps = contenu.slice(Number(first[1]));
    for (let i = 0; i < Number(n[1]); i++) {
      const numero = table[i * 2];
      const decalage = table[i * 2 + 1];
      if (!Number.isFinite(numero) || !Number.isFinite(decalage)) continue;
      const suivant = table[i * 2 + 3];
      objets.set(
        String(numero),
        corps.slice(decalage, Number.isFinite(suivant) ? suivant : undefined)
      );
    }
  }
  return objets;
}

/**
 * Métriques des polices embarquées, déclarées en clair dans les descripteurs.
 *
 * L'ordre des clés d'un dictionnaire PDF est libre : `/CapHeight` précède
 * souvent `/FontName`, `/XHeight` le suit. On borne donc la lecture à l'objet
 * descripteur lui-même plutôt que de regarder en aval du nom, sinon la hauteur
 * de capitale — celle des chiffres du poids net (§4) — est perdue en silence.
 */
export function lireMetriques(objets: Map<string, string>): Record<string, MetriquePolice> {
  const polices: Record<string, MetriquePolice> = {};
  for (const corps of objets.values()) {
    const nom = /\/FontName\s*\/([A-Za-z0-9+\-.]+)/.exec(corps);
    const xh = /\/XHeight\s+(-?\d+)/.exec(corps);
    if (!nom || !xh) continue;
    const cap = /\/CapHeight\s+(-?\d+)/.exec(corps);
    const propre = nomPolice(nom[1]);
    polices[propre] = {
      nom: propre,
      xHeight: Number(xh[1]),
      capHeight: cap ? Number(cap[1]) : null,
    };
  }
  return polices;
}

/** Table ressource (`T1_0`) → nom de police, lue dans les dictionnaires de page. */
export function lireRessources(objets: Map<string, string>): Record<string, string> {
  const table: Record<string, string> = {};

  // Numéro d'objet → nom de police, pour les dictionnaires de police.
  const parNumero = new Map<string, string>();
  for (const [numero, corps] of objets) {
    const base = /\/BaseFont\s*\/([A-Za-z0-9+\-.]+)/.exec(corps);
    if (base) parNumero.set(numero, nomPolice(base[1]));
  }

  // Ressources de page : /T1_0 12 0 R.
  const paires = /\/(T1_\d+|TT\d+|F\d+)\s+(\d+)\s+\d+\s+R/g;
  for (const corps of objets.values()) {
    let p: RegExpExecArray | null;
    while ((p = paires.exec(corps)) !== null) {
      const nom = parNumero.get(p[2]);
      if (nom) table[p[1]] = nom;
    }
  }
  return table;
}

