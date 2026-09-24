/**
 * The net weight as the fiche shows it.
 *
 * The workbook column is "POIDS G OU KG": grams for retail packs ("100",
 * "50"), kilograms for bulk ("1.5", "1,5", "1"). The fiche used to append "g"
 * to everything, so TB4041 Ché Chun 1,5 kg read "1.5 g". No JDG pack weighs
 * under 5 g, and no bulk bag weighs 5 kg or more: the threshold separates them.
 * Anything that is not a plain number ("80 -> 30", "3 pièces", "?") is shown
 * as written — it is a question for JDG, not a weight to reformat.
 */
const SEUIL_KG = 5;
const NOMBRE = /^\d+(?:[.,]\d+)?$/;

export function formaterPoidsNet(valeur: string | null | undefined): string | null {
  const brut = valeur?.trim() ?? "";
  if (brut === "") return null;
  if (!NOMBRE.test(brut)) return brut;
  const nombre = Number(brut.replace(",", "."));
  const affiche = brut.replace(".", ",");
  return nombre < SEUIL_KG ? `${affiche} kg` : `${affiche} g`;
}
