/**
 * Deterministic declared ingredient list (SPEC-03b §5.5) — the text printed on
 * the label, generated from a computed recette. Pure/testable. Used both by the
 * read-only display (RecetteListeGeneree) and, on validation, to align the
 * fiche's declared composition with the validated recette (Lot 5).
 */

export interface IngredientListe {
  designation: string;
  pourcentageEtiquette: number;
  estDemeter: boolean;
  estEquitable: boolean;
  ordreTri: number;
}

/**
 * Ordered by `ordreTri`, each line "designation✱° P %", joined ", " + ".".
 * `etiquettes` (optional, same order as `ingredients`) applies Marie's per-line
 * label-% overrides. `masques` (optional, same order) drops the "P %" for the
 * ingredients Marie hides on the label (industrial secret) — the name and the
 * Demeter/fair-trade markers always stay. Empty input → empty string.
 */
export function genererListeIngredients(
  ingredients: IngredientListe[],
  etiquettes?: number[],
  masques?: boolean[]
): string {
  const lignes = ingredients
    .map((ing, i) => ({
      ing,
      pct: etiquettes?.[i] ?? ing.pourcentageEtiquette,
      masque: masques?.[i] ?? false,
    }))
    .sort((a, b) => a.ing.ordreTri - b.ing.ordreTri)
    .map(({ ing, pct, masque }) => {
      const marqueurs = `${ing.estDemeter ? "✱" : ""}${ing.estEquitable ? "°" : ""}`;
      return masque
        ? `${ing.designation}${marqueurs}`
        : `${ing.designation}${marqueurs} ${pct} %`;
    });
  return lignes.length > 0 ? lignes.join(", ") + "." : "";
}
