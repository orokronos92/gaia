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

export function parseIngredientsTexte(
  texte: string | null | undefined
): IngredientExtrait[] {
  if (!texte) return [];

  const sansPrefixe = texte.replace(PREFIXE_LISTE, "");
  const tokens = sansPrefixe
    .split(SEPARATEURS)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: IngredientExtrait[] = [];
  for (const tok of tokens) {
    const m = tok.match(POURCENT);
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
