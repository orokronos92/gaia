/**
 * A card's face-to-face table: what diverges, one line per element, two
 * columns side by side — "Mesuré sur le BAT / Exigé" for a measurement,
 * "Fiche / Étiquette" for a value. Only the diverging lines are carried; the
 * matching ones are only counted (decision 2026-09-24: Quality reads the
 * problem, not the list).
 */
export interface LigneFaceAFace {
  element: string;
  gauche: string;
  droite: string;
  /** Small print under the left value (font and size of a measured word). */
  detail?: string;
}

export interface FaceAFace {
  colonnes: { element: string; gauche: string; droite: string };
  /** One line above the table: the frame the requirement comes from. */
  contexte?: string;
  lignes: LigneFaceAFace[];
  /** Elements checked and found right, not listed. */
  conformes?: number;
}

/**
 * "1.427" → "1,427 mm": the measure's own precision, French comma. Two decimals
 * showed 0.896 as "0,9 mm" next to "≥ 0,9 mm" — a failure that read as a pass.
 */
export const mm = (v: number): string => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} mm`;

export const COLONNES_MESURE = { element: "Élément", gauche: "Mesuré sur le BAT", droite: "Exigé" } as const;
