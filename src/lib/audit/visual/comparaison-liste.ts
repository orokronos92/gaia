/**
 * The ingredient list of the fiche, face to face with the one printed on the BAT.
 *
 * The earlier check looked for each fiche item anywhere in the BAT text. It
 * could say "pétales de fleurs* not found", never what the label prints in its
 * place, and it could not see an ingredient the label adds (TM0306 prints
 * "pétales de souci*" on top of the workbook list) nor a changed order.
 *
 * Here the printed list is read out of the BAT text, split with the same rule as
 * the fiche's (elements-liste.ts), and the two sequences are aligned. Only the
 * differences come out: Quality reads what diverges, not what matches.
 */
import { normalize } from "../canonical";
import { elementsListe } from "./elements-liste";

export type EcartListe =
  | { type: "different"; fiche: string; etiquette: string }
  | { type: "manque"; fiche: string }
  | { type: "en_plus"; etiquette: string }
  | { type: "ordre"; element: string; rangFiche: number; rangEtiquette: number };

/**
 * "INGRÉDIENTS", "Ingrédients :", "Ingrédient :" — a heading, followed by a
 * colon, the end of its line, or the wide gap pdftotext leaves before the next
 * column (TUTA6152). "…des ingrédients qui la composent" in the product text
 * is not one (TR2452).
 */
const ENTETE_FR = /ingr[ée]dients?(?=[ \t\u00a0]*(?::|\r?\n)|[ \t\u00a0]{2,})/gi;
const ACCENTUE = /[éÉ]/;

/** Comparable form: case, accents, apostrophes, spaces before a unit. */
export function cleElement(element: string): string {
  return normalize(element)
    .replace(/[’‘]/g, "'")
    .replace(/(\d)\s*(g|kg|mg|ml|cl|%)/gi, "$1$2")
    .replace(/\s*([()])\s*/g, "$1")
    .trim();
}

/**
 * The list printed on the BAT, from the extracted text, or null when the text
 * carries none (outlined text, or the ingredient face is missing).
 *
 * The French heading is preferred to the English one: "INGRÉDIENTS" with its
 * accent, then any "ingredients". A word cut at the end of a line
 * ("Cymbo-\npogon") is joined back before the lines are.
 */
export function listeImprimee(texteBat: string): string[] | null {
  const entetes = [...texteBat.matchAll(ENTETE_FR)];
  if (entetes.length === 0) return null;
  const entete = entetes.find((m) => ACCENTUE.test(m[0])) ?? entetes[0];
  const suite = texteBat
    .slice((entete.index ?? 0) + entete[0].length)
    .replace(/-\s*\n\s*(?=\p{Ll})/gu, "")
    .replace(/\s+/g, " ")
    .replace(/^\s*:?\s*/, "");
  const { elements } = elementsListe(suite);
  return elements.length > 0 ? elements : null;
}

/** Longest common subsequence of two key lists, as index pairs. */
function appariement(a: string[], b: string[]): Array<[number, number]> {
  const t = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
    }
  }
  const paires: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      paires.push([i, j]);
      i++;
      j++;
    } else if (t[i + 1][j] >= t[i][j + 1]) i++;
    else j++;
  }
  return paires;
}

/**
 * The differences between the fiche's list and the printed one, in fiche order.
 *
 * Aligned items are identical and say nothing. An item found on both sides but
 * out of sequence is an order difference. What is left between two aligned
 * items is paired up as "different" — the label prints something else at that
 * place — and the surplus on either side is missing or extra.
 */
export function comparerListes(fiche: string[], etiquette: string[]): EcartListe[] {
  const cf = fiche.map(cleElement);
  const ce = etiquette.map((e) => {
    const cle = cleElement(e);
    const sansIntrus = cleElement(sansMotsVoisins(e));
    // A word from the next column fell into the item: the item is the fiche's.
    return !cf.includes(cle) && cf.includes(sansIntrus) ? sansIntrus : cle;
  });
  const paires = appariement(cf, ce);
  const alignesF = new Set(paires.map(([i]) => i));
  const alignesE = new Set(paires.map(([, j]) => j));

  const ecarts: EcartListe[] = [];
  const deplacesF = new Set<number>();
  const deplacesE = new Set<number>();
  cf.forEach((cle, i) => {
    if (alignesF.has(i)) return;
    const j = ce.findIndex((c, k) => c === cle && !alignesE.has(k) && !deplacesE.has(k));
    if (j < 0) return;
    deplacesF.add(i);
    deplacesE.add(j);
    ecarts.push({ type: "ordre", element: fiche[i], rangFiche: i + 1, rangEtiquette: j + 1 });
  });

  // The gaps between consecutive aligned pairs, plus the tail after the last.
  const bornes: Array<[number, number]> = [[-1, -1], ...paires, [fiche.length, etiquette.length]];
  for (let k = 0; k < bornes.length - 1; k++) {
    const [fi, ej] = bornes[k];
    const [fi2, ej2] = bornes[k + 1];
    const restesF = range(fi + 1, fi2).filter((i) => !deplacesF.has(i));
    const restesE = range(ej + 1, ej2).filter((j) => !deplacesE.has(j));
    const communs = Math.min(restesF.length, restesE.length);
    for (let n = 0; n < communs; n++) ecarts.push({ type: "different", fiche: fiche[restesF[n]], etiquette: etiquette[restesE[n]] });
    for (const i of restesF.slice(communs)) ecarts.push({ type: "manque", fiche: fiche[i] });
    for (const j of restesE.slice(communs)) ecarts.push({ type: "en_plus", etiquette: etiquette[j] });
  }
  return ecarts;
}

/**
 * The item without the capitalised words the page layout slipped into it.
 *
 * pdftotext reads a line across columns: on TUTA6152 the list picks up
 * "TASSES Thé vert*" and "morceaux de Douceur mangue*" from the panel beside
 * it. In a JDG list only the first word and the Latin names in parentheses
 * carry a capital: of a leading run of capitalised words the last one is the
 * item's own, and a capitalised word after the first lowercase one is a
 * neighbour, never an ingredient.
 */
function sansMotsVoisins(element: string): string {
  const mots = element.split(/\s+/);
  const majuscule = (mot: string) => /^\p{Lu}/u.test(mot);
  const premierMinuscule = mots.findIndex((mot) => !majuscule(mot));
  if (premierMinuscule < 0) return element;
  let profondeur = 0;
  return mots
    .filter((mot, i) => {
      const garde =
        i === premierMinuscule - 1 ||
        (i >= premierMinuscule && (profondeur > 0 || mot.startsWith("(") || !majuscule(mot)));
      profondeur += (mot.match(/\(/g) ?? []).length - (mot.match(/\)/g) ?? []).length;
      return garde;
    })
    .join(" ");
}

const range = (debut: number, fin: number) => Array.from({ length: Math.max(0, fin - debut) }, (_, i) => debut + i);

/** One line per difference, for the report and the audit trail. */
export function decrireEcart(e: EcartListe): string {
  switch (e.type) {
    case "different":
      return `fiche « ${e.fiche} », étiquette « ${e.etiquette} »`;
    case "manque":
      return `« ${e.fiche} » absent de l'étiquette`;
    case "en_plus":
      return `« ${e.etiquette} » imprimé en plus sur l'étiquette`;
    case "ordre":
      return `« ${e.element} » ${e.rangFiche}ᵉ sur la fiche, ${e.rangEtiquette}ᵉ sur l'étiquette`;
  }
}
