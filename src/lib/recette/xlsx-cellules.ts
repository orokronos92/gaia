/**
 * Cell-level primitives for reading a JDG recette workbook by address.
 *
 * The recette sheet is the authoritative composition, so it must be READ, not
 * inferred. Flattening a sheet to tab-separated text loses the column grid —
 * "COMMERCE\nEQUITABLE" turns one header line into three, and "QTÉ\t EN KG"
 * splits one cell into two — which is how a fair-trade tick became a Demeter
 * tick on TA602. Everything here works from the cell address instead.
 */

import * as xlsx from "xlsx";

/**
 * Label comparison form: accents stripped, every run of whitespace (including
 * the embedded CR/LF and TAB that JDG's headers carry) collapsed to one space,
 * uppercased, trailing punctuation dropped.
 */
export function normaliser(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\u00a0]+/g, " ")
    .trim()
    .replace(/[:.\s]+$/, "")
    .toUpperCase();
}

export function adresse(colonne: number, ligne: number): string {
  return xlsx.utils.encode_cell({ c: colonne, r: ligne });
}

/** Raw cell text, trimmed. Empty and absent cells both yield "". */
export function texteCellule(
  feuille: xlsx.WorkSheet,
  colonne: number,
  ligne: number
): string {
  const cellule = feuille[adresse(colonne, ligne)] as xlsx.CellObject | undefined;
  if (!cellule || cellule.v === null || cellule.v === undefined) return "";
  return String(cellule.v).trim();
}

/**
 * Numeric cell value. Excel stores these as numbers; a hand-typed cell may be a
 * string with a decimal comma. Anything else yields null — a figure is never
 * guessed.
 */
export function nombreCellule(
  feuille: xlsx.WorkSheet,
  colonne: number,
  ligne: number
): number | null {
  const cellule = feuille[adresse(colonne, ligne)] as xlsx.CellObject | undefined;
  if (!cellule || cellule.v === null || cellule.v === undefined) return null;
  if (typeof cellule.v === "number") return Number.isFinite(cellule.v) ? cellule.v : null;
  const brut = String(cellule.v).trim().replace(/\s/g, "").replace(",", ".");
  if (brut === "") return null;
  const valeur = Number(brut);
  return Number.isFinite(valeur) ? valeur : null;
}

/** Bounds of the used range, or null on an empty sheet. */
export function etendue(feuille: xlsx.WorkSheet): xlsx.Range | null {
  const ref = feuille["!ref"];
  return typeof ref === "string" ? xlsx.utils.decode_range(ref) : null;
}

/** Marks JDG uses for a ticked box, and the ones that explicitly mean "no". */
const MARQUES_POSITIVES = new Set(["X", "✓", "V", "OUI", "O", "1", "YES"]);
const MARQUES_NEGATIVES = new Set(["", "NON", "N", "0", "-", "/", "NA", "N/A", "SANS"]);

export interface LectureCase {
  cochee: boolean;
  /** Set when the cell holds something that is neither a known mark nor a known "no". */
  valeurInattendue: string | null;
}

/**
 * Reads a tick column. A recognised mark is true, a recognised "no" (or an empty
 * cell) is false; anything else counts as ticked but is reported, because an
 * unexpected value in a certification column is a question for Marie, not
 * something to swallow.
 */
export function lireCase(
  feuille: xlsx.WorkSheet,
  colonne: number,
  ligne: number
): LectureCase {
  const brut = texteCellule(feuille, colonne, ligne);
  const cle = normaliser(brut);
  if (MARQUES_NEGATIVES.has(cle)) return { cochee: false, valeurInattendue: null };
  if (MARQUES_POSITIVES.has(cle)) return { cochee: true, valeurInattendue: null };
  return { cochee: true, valeurInattendue: brut };
}
