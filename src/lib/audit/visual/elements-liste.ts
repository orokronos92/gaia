/**
 * Splits a declared ingredient list into the items the BAT must print.
 *
 * The list comes either from the recette étiquette or, failing that, from the
 * catalogue workbook cell (migration 0031). The cell is written for a person:
 * it opens with "Ingrédients :", closes with the "*Issu de l'agriculture
 * biologique." note, nests commas in parentheses — "arômes naturels de (poire*,
 * litchi) 11%" — and sometimes carries a second paragraph (a nutrition
 * statement, a liquorice warning, or a next recipe: "Recette à venir fin 2026").
 * Measured on the 394 preprod products with a BAT (2026-09-24), comparing that
 * text item by item put 269 in FAIL; almost all of it was this layout.
 *
 * Only the list itself is compared: the heading, the notes and the later
 * paragraphs are the business of other controls.
 */

/** "Ingrédients :" / "Ingrédient :", any case, a non-breaking space allowed. */
const ENTETE = /^\s*ingr[ée]dients?\s*:\s*/i;
/** A later paragraph that is another list, not a note. */
const AUTRE_LISTE = /^\s*ingr[ée]dients?\s*:/im;

export interface ElementsListe {
  elements: string[];
  /** The cell holds a second list after the first — ignored, but said. */
  autreListeIgnoree: boolean;
}

/**
 * End of the list: the first "." outside parentheses that is not a decimal
 * point ("15.5 %"). What follows is the organic note or another sentence.
 */
function finDeListe(texte: string): number {
  let profondeur = 0;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (c === "(" || c === "[") profondeur++;
    else if ((c === ")" || c === "]") && profondeur > 0) profondeur--;
    else if (c === "." && profondeur === 0 && !/\d/.test(texte[i + 1] ?? "")) return i;
  }
  return texte.length;
}

/** Commas outside parentheses and not before a digit — "15,5%" stays whole, "tilleul*,mélisse*" splits. */
function decouper(texte: string): string[] {
  const elements: string[] = [];
  let profondeur = 0;
  let debut = 0;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (c === "(" || c === "[") profondeur++;
    else if ((c === ")" || c === "]") && profondeur > 0) profondeur--;
    else if (c === "," && profondeur === 0 && !/\d/.test(texte[i + 1] ?? "")) {
      elements.push(texte.slice(debut, i));
      debut = i + 1;
    }
  }
  elements.push(texte.slice(debut));
  return elements.map((e) => e.trim()).filter(Boolean);
}

export function elementsListe(liste: string): ElementsListe {
  // The heading may sit alone on its line: strip it before looking for the end.
  const corps = liste.trim().replace(ENTETE, "");
  const saut = corps.search(/\r?\n/);
  const fin = Math.min(finDeListe(corps), saut < 0 ? corps.length : saut);
  return {
    elements: decouper(corps.slice(0, fin)),
    autreListeIgnoree: AUTRE_LISTE.test(corps.slice(fin)),
  };
}
