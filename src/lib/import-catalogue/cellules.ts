/**
 * Cell and header helpers for the catalogue workbook. Pure: they receive the
 * rows the script read, never the file.
 */

export type Cellule = string | number | boolean | null | undefined;
export type Ligne = readonly Cellule[];

/** Header as a person reads it: line breaks and runs of spaces collapsed, case ignored. */
export function normaliserEntete(entete: Cellule): string {
  return String(entete ?? "").replace(/\s+/g, " ").trim().toUpperCase();
}

/** Accents, case and spacing ignored — used to match reference labels (gammes). */
export function normaliserLibelle(libelle: string): string {
  return libelle
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Text of a cell: CRLF to LF, trimmed, empty → null. Numbers keep their JS form ("1.5"). */
export function texte(cellule: Cellule): string | null {
  if (cellule === null || cellule === undefined) return null;
  const valeur = String(cellule).replace(/\r\n?/g, "\n").trim();
  return valeur === "" ? null : valeur;
}

/** The workbook writes "absent" as "/", "-" or a dash; those are not values. */
export function texteOuAbsent(cellule: Cellule): string | null {
  const valeur = texte(cellule);
  return valeur === null || /^[\s/–—-]+$/.test(valeur) ? null : valeur;
}

export class ColonneManquanteError extends Error {
  constructor(public readonly colonnes: readonly string[]) {
    super(`Colonnes introuvables dans l'onglet : ${colonnes.join(", ")}`);
  }
}

/**
 * Maps each expected header to its column index, by exact normalized name.
 * The first occurrence wins when a header repeats. A missing header throws:
 * guessing a column is how the previous seed read the wrong one.
 */
export function indexerColonnes<T extends string>(
  entetes: Ligne,
  attendues: readonly T[],
): Record<T, number> {
  const positions = new Map<string, number>();
  entetes.forEach((entete, i) => {
    const cle = normaliserEntete(entete);
    if (cle && !positions.has(cle)) positions.set(cle, i);
  });
  const manquantes = attendues.filter((nom) => !positions.has(normaliserEntete(nom)));
  if (manquantes.length > 0) throw new ColonneManquanteError(manquantes);
  return Object.fromEntries(attendues.map((nom) => [nom, positions.get(normaliserEntete(nom))])) as Record<T, number>;
}
