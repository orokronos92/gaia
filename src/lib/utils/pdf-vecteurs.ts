/**
 * Lecture des tracés vectoriels d'un PDF.
 *
 * Un logo n'est pas du texte : le PDF ne dit nulle part qu'une forme *est*
 * l'Eurofeuille. Mais un logo est un artwork **fixe**, reposé à l'identique
 * d'une étiquette à l'autre, et sa géométrie, elle, est écrite en clair dans le
 * flux de contenu. Le nombre de sous-tracés et de courbes d'un dessin est donc
 * une empreinte : invariante en translation et en échelle, elle identifie le
 * dessin sans qu'aucun modèle n'ait à le regarder.
 *
 * On suit l'état graphique comme le ferait un moteur de rendu — pile `q`/`Q`,
 * matrice courante `cm` — pour que les coordonnées soient celles de la page et
 * non celles d'un repère local.
 */

import { inflateSync } from "zlib";

type Matrice = [number, number, number, number, number, number];

const IDENTITE: Matrice = [1, 0, 0, 1, 0, 0];

function multiplier(m: Matrice, n: Matrice): Matrice {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

function appliquer(m: Matrice, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** Un tracé peint, réduit à ce qui l'identifie et le situe. */
export interface TraceVectoriel {
  /** Nombre de sous-tracés (`m` et `re`). */
  sousTraces: number;
  /** Segments droits (`l`). */
  droites: number;
  /** Segments courbes (`c`, `v`, `y`). */
  courbes: number;
  /** Rectangles (`re`). */
  rectangles: number;
  /** Boîte englobante, en points, dans le repère de la page. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface EnCours {
  sousTraces: number;
  droites: number;
  courbes: number;
  rectangles: number;
  xs: number[];
  ys: number[];
}

const NOMBRE = "(-?[\\d.]+)";
const OPERATEURS = new RegExp(
  [
    `${NOMBRE}\\s+${NOMBRE}\\s+${NOMBRE}\\s+${NOMBRE}\\s+${NOMBRE}\\s+${NOMBRE}\\s+(cm|c)`,
    `${NOMBRE}\\s+${NOMBRE}\\s+${NOMBRE}\\s+${NOMBRE}\\s+(re|v|y)`,
    `${NOMBRE}\\s+${NOMBRE}\\s+(m|l)`,
    `(q|Q|h|n|f\\*|f|F|S|s|B\\*|B|b\\*|b|W\\*|W)(?![a-zA-Z])`,
  ].join("|"),
  "g"
);

/** Tous les tracés peints d'un PDF, toutes pages confondues. */
export function lireTraces(pdf: Buffer): TraceVectoriel[] {
  const traces: TraceVectoriel[] = [];
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
      continue; // flux non compressé, police ou image
    }
    if (!/\s(m|re)\s/.test(contenu)) continue;

    let ctm: Matrice = IDENTITE;
    const pile: Matrice[] = [];
    let courant: EnCours | null = null;

    const ouvrir = (): EnCours => ({
      sousTraces: 0,
      droites: 0,
      courbes: 0,
      rectangles: 0,
      xs: [],
      ys: [],
    });
    const poser = (x: number, y: number) => {
      const [dx, dy] = appliquer(ctm, x, y);
      courant!.xs.push(dx);
      courant!.ys.push(dy);
    };
    const fermer = () => {
      if (courant && courant.xs.length > 0) {
        traces.push({
          sousTraces: courant.sousTraces,
          droites: courant.droites,
          courbes: courant.courbes,
          rectangles: courant.rectangles,
          x0: Math.min(...courant.xs),
          y0: Math.min(...courant.ys),
          x1: Math.max(...courant.xs),
          y1: Math.max(...courant.ys),
        });
      }
      courant = null;
    };

    let o: RegExpExecArray | null;
    OPERATEURS.lastIndex = 0;
    while ((o = OPERATEURS.exec(contenu)) !== null) {
      if (o[7] !== undefined) {
        const v = [1, 2, 3, 4, 5, 6].map((i) => Number(o![i])) as unknown as Matrice;
        if (o[7] === "cm") {
          ctm = multiplier(v, ctm);
        } else {
          courant ??= ouvrir();
          courant.courbes += 1;
          poser(v[4], v[5]);
        }
      } else if (o[12] !== undefined) {
        const [a, b, c, d] = [8, 9, 10, 11].map((i) => Number(o![i]));
        courant ??= ouvrir();
        if (o[12] === "re") {
          courant.rectangles += 1;
          courant.sousTraces += 1;
          poser(a, b);
          poser(a + c, b + d);
        } else {
          // `v` et `y` : dans les deux cas le point d'arrivée est le dernier couple.
          courant.courbes += 1;
          poser(c, d);
        }
      } else if (o[15] !== undefined) {
        const [a, b] = [13, 14].map((i) => Number(o![i]));
        courant ??= ouvrir();
        if (o[15] === "m") courant.sousTraces += 1;
        else courant.droites += 1;
        poser(a, b);
      } else if (o[16] !== undefined) {
        const op = o[16];
        if (op === "q") pile.push(ctm);
        else if (op === "Q") ctm = pile.pop() ?? IDENTITE;
        // `h` referme un sous-tracé, `W`/`W*` posent un rognage : ni l'un ni
        // l'autre ne termine le tracé, tous les autres opérateurs le peignent.
        else if (op !== "h" && op !== "W" && op !== "W*") fermer();
      }
    }
    fermer();
  }
  return traces;
}
