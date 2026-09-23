/**
 * Free-text search that ignores accents and case: typing "che chun" must find
 * "Ché Chun". The same letters are folded in SQL (translate) and here, so no
 * database extension is needed.
 */

/** Accented letters and their plain form, position by position. */
export const LETTRES_ACCENTUEES = "ÀÂÄÁÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÇÑàâäáãéèêëíìîïóòôöõúùûüçñ’";
export const LETTRES_SIMPLES = "AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'";

/** "Ché  Chun" → "%che chun%", with LIKE wildcards in the input escaped. */
export function motifRecherche(saisie: string): string {
  const plie = saisie
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/’/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\\%_]/g, (c) => `\\${c}`);
  return `%${plie}%`;
}
