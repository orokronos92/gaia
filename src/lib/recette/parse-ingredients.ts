/**
 * Best-effort parser for a free-text ingredient list (SPEC-03b §2 pre-fill).
 *
 * The only ingredient source available before a recipe exists is extracted text
 * (`produits.ingredientsSuggestion` — designations, e.g. "HE orange – gingembre
 * – hibiscus" — or `fichesEtiquettes.ingredientsFr` which may carry display %).
 * This turns that text into rows: a designation, and a display % when one is
 * present. Missing % → the line is left for Marie (never guessed). Pure/testable.
 */

export interface IngredientExtrait {
  designation: string;
  pourcentage: number | null;
}

// Split on list separators only: a dash surrounded by spaces, ; · newline, or a
// comma NOT followed by a digit (so the decimal in "15,5 %" is preserved).
// Spaced dashes split "gingembre - hibiscus" without breaking "sous-bois".
const SEPARATEURS = /\s[–—-]\s|[;\n·]|,(?!\d)/g;
const POURCENT = /(\d+(?:[.,]\d+)?)\s*%/;

const PREFIXE_LISTE =
  /^\s*(liste\s+d['’]ingr[ée]dient[s]?|ingr[ée]dients?)\s*:?\s*/i;

/**
 * The footnotes a printed list ends with ("*Issu de l'agriculture biologique.",
 * "Garanti sans résidus…") are not ingredients: the list stops at the first
 * full stop followed by a marker or a capital.
 */
const NOTES = /\.\s+(?=\*|[A-ZÉÈÀ])/;

/** Split on separators outside parentheses: "épices (cannelle*, gingembre*) 15%" stays one line. */
function decouperHorsParentheses(texte: string): string[] {
  const morceaux: string[] = [];
  let profondeur = 0;
  let debut = 0;
  const separateur = new RegExp(SEPARATEURS.source, "y");
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte[i];
    if (c === "(") profondeur += 1;
    else if (c === ")") profondeur = Math.max(0, profondeur - 1);
    else if (profondeur === 0) {
      separateur.lastIndex = i;
      const m = separateur.exec(texte);
      if (m) {
        morceaux.push(texte.slice(debut, i));
        debut = i + m[0].length;
        i = debut - 1;
      }
    }
  }
  morceaux.push(texte.slice(debut));
  return morceaux;
}

export function parseIngredientsTexte(
  texte: string | null | undefined
): IngredientExtrait[] {
  if (!texte) return [];

  const sansPrefixe = texte.replace(PREFIXE_LISTE, "").split(NOTES)[0];
  const tokens = decouperHorsParentheses(sansPrefixe)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: IngredientExtrait[] = [];
  for (const tok of tokens) {
    // The % of a compound ingredient follows its parenthesis: read it outside.
    const m = tok.replace(/\([^)]*\)/g, "").match(POURCENT) ?? tok.match(POURCENT);
    const pourcentage = m ? Number(m[1].replace(",", ".")) : null;

    const designation = tok
      .replace(new RegExp(POURCENT, "g"), "") // drop the % value
      .replace(/[*°•·]+/g, "") // bio / fair-trade markers
      .replace(/\(\s*bio\s*\)/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .replace(/[.,;:]+$/, "")
      .trim();

    if (designation) {
      out.push({
        designation,
        pourcentage: pourcentage != null && Number.isFinite(pourcentage) ? pourcentage : null,
      });
    }
  }
  return out;
}
