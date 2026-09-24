/**
 * The fiche field a failed point lets Quality correct in place.
 *
 * Only the control knows which field its divergence is about; the card offers
 * "Corriger la fiche" when it names one. The server never takes the table or
 * the field from the browser: it recomputes the checklist and reads them here
 * (decision 2026-09-24).
 */
export const CHAMPS_CORRIGEABLES = {
  produit: ["codeEan", "poidsNet", "denominationFr"],
  fiche: ["listeIngredientsBddFr"],
} as const;

export type CorrectionFiche =
  | { table: "produit"; champ: (typeof CHAMPS_CORRIGEABLES.produit)[number]; valeur: string | null; libelle: string }
  | { table: "fiche"; champ: (typeof CHAMPS_CORRIGEABLES.fiche)[number]; valeur: string | null; libelle: string };
