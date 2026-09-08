/**
 * Où se trouve la réponse, sur l'étiquette.
 *
 * Un contrôle qui dit « hauteur de x 1,067 mm » oblige encore Marie à chercher
 * de quel texte il parle. Nos mesures savent pourtant exactement où il est :
 * poppler donne la boîte de chaque mot, le flux de contenu celle de chaque
 * tracé.
 *
 * La conversion se fait **ici, côté serveur, en fractions de l'image**. Le
 * navigateur ne fait alors aucun calcul de repère : il pose un rectangle à
 * `x %` et `y %` de l'image, quelle que soit la résolution de rendu ou le
 * niveau de zoom. Les trois systèmes de coordonnées d'un BAT ne franchissent
 * jamais la frontière du serveur.
 */

import type { MotBat, PageBat } from "@/lib/utils/pdf-bat";

/** Une zone à montrer, en fractions de la face rendue (0 → 1). */
export interface RepereBat {
  /** Index de la face, dans l'ordre où elles ont été lues. */
  face: number;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  /** Ce que la zone désigne, affiché à côté du cadre. */
  libelle?: string;
}

const borne = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Un mot de poppler.
 * Ses coordonnées descendent déjà depuis le coin haut-gauche du rognage : il
 * n'y a qu'à diviser.
 */
export function repereMot(mot: MotBat, page: PageBat, face: number, libelle?: string): RepereBat {
  return {
    face,
    x: borne(mot.x / page.largeurPt),
    y: borne(mot.y / page.hauteurPt),
    largeur: borne(mot.largeur / page.largeurPt),
    hauteur: borne(mot.hauteur / page.hauteurPt),
    libelle,
  };
}

/**
 * Une boîte du flux de contenu — un tracé, un logo.
 * Deux corrections : l'origine de l'espace usager n'est pas celle du rognage,
 * et l'axe Y y monte. Le haut du rectangle est donc le `y1` du tracé.
 */
export function repereBoitePdf(
  boite: { x0: number; y0: number; x1: number; y1: number },
  page: PageBat,
  face: number,
  libelle?: string
): RepereBat {
  const largeur = page.rognage.x1 - page.rognage.x0;
  const hauteur = page.rognage.y1 - page.rognage.y0;
  if (largeur <= 0 || hauteur <= 0) {
    return { face, x: 0, y: 0, largeur: 0, hauteur: 0, libelle };
  }
  return {
    face,
    x: borne((boite.x0 - page.rognage.x0) / largeur),
    y: borne((page.rognage.y1 - boite.y1) / hauteur),
    largeur: borne((boite.x1 - boite.x0) / largeur),
    hauteur: borne((boite.y1 - boite.y0) / hauteur),
    libelle,
  };
}

/** Le rectangle qui contient tous les repères d'une même face. */
export function englobant(reperes: RepereBat[]): RepereBat | null {
  const face = reperes[0]?.face;
  const memeFace = reperes.filter((r) => r.face === face);
  if (memeFace.length === 0) return null;

  const x = Math.min(...memeFace.map((r) => r.x));
  const y = Math.min(...memeFace.map((r) => r.y));
  return {
    face,
    x,
    y,
    largeur: Math.max(...memeFace.map((r) => r.x + r.largeur)) - x,
    hauteur: Math.max(...memeFace.map((r) => r.y + r.hauteur)) - y,
  };
}
