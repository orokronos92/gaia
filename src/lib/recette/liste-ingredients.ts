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

/** Une ligne de recette telle que la base la stocke. */
export interface LigneRecettePersistee {
  designation: string;
  designationEtiquette?: string | null;
  pourcentageEtiquette: number;
  ordreTri: number;
  estDemeter: boolean;
  estEquitable: boolean;
  estBio?: boolean;
  masquerPourcentageEtiquette?: boolean;
}

/**
 * La liste telle qu'elle sera IMPRIMÉE — la recette étiquette (décision
 * 2026-09-10), et la seule chose que l'audit confronte au BAT.
 *
 * Chaque ligne prend la dénomination que la Qualité a relue, ou à défaut celle
 * de la recette. Ce défaut n'est pas un repli commode : une ligne encore au nom
 * R&D produit « SORWATHE OP1 » là où le BAT imprime « thé noir », et c'est
 * précisément l'écart que le contrôle doit faire remonter plutôt que masquer.
 */
export function listeEtiquette(lignes: LigneRecettePersistee[]): string {
  return genererListeIngredients(
    lignes.map((l) => ({
      designation: l.designationEtiquette ?? l.designation,
      pourcentageEtiquette: l.pourcentageEtiquette,
      ordreTri: l.ordreTri,
      estDemeter: l.estDemeter,
      estEquitable: l.estEquitable,
      estBio: l.estBio,
    })),
    undefined,
    lignes.map((l) => l.masquerPourcentageEtiquette ?? false)
  );
}

/**
 * The label list the controls read: the recette étiquette when there is one,
 * otherwise the list the catalogue workbook gives (migration 0031). For older
 * recipes the workbook is the only record; a re-integrated recipe sheet takes
 * over by itself, since its lines come first (decision 2026-09-23).
 */
export function listeEtiquetteOuBdd(lignes: LigneRecettePersistee[], listeBdd: string | null | undefined): string | null {
  return listeEtiquette(lignes) || listeBdd?.trim() || null;
}
