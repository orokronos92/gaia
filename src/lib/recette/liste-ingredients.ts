/**
 * Deterministic declared ingredient list (SPEC-03b §5.5) — the text printed on
 * the label, generated from a computed recette. Pure/testable. Used both by the
 * read-only display (RecetteListeGeneree) and, on validation, to align the
 * fiche's declared composition with the validated recette (Lot 5).
 */

export interface IngredientListe {
  designation: string;
  pourcentageEtiquette: number;
  /** « * issu de l'agriculture biologique ». Absent = considéré bio (défaut JDG). */
  estBio?: boolean;
  estDemeter: boolean;
  estEquitable: boolean;
  ordreTri: number;
}

/**
 * Ordered by `ordreTri`, each line "designation* P %", joined ", " + ".".
 *
 * Marker convention — PRO-QHS-013 §11.1, control point 2.4:
 *   `*`  issu de l'agriculture biologique
 *   `**` Demeter (and the ingredient set in bold italic on the artwork, which
 *        only the printed label can carry — not this text)
 * Demeter implies organic, so `**` replaces `*` rather than adding to it.
 *
 * There is deliberately no per-ingredient fair-trade marker: §11.1 defines none,
 * and the TA7372 artwork prints "Thé noir*" for an ingredient the recipe flags
 * as fair trade. `estEquitable` stays in the model — it drives the Demeter/WFTO
 * reasoning — but it prints nothing.
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
      const marqueurs = ing.estDemeter ? "**" : (ing.estBio ?? true) ? "*" : "";
      return masque
        ? `${ing.designation}${marqueurs}`
        : `${ing.designation}${marqueurs} ${pct} %`;
    });
  return lignes.length > 0 ? lignes.join(", ") + "." : "";
}
