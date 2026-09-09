/**
 * Builds the applicability `AuditContext` from already-fetched audit input.
 * Pure and DB-free. The `estCamellia` / `contientReglisse` flags are
 * authoritative; designation scans are fallbacks for not-yet-flagged data.
 */

import {
  allergeneMatierePresent,
  CAMELLIA_KEYWORDS,
  normalize,
  REGLISSE_KEYWORDS,
} from "./canonical";
import type { AuditContext, AuditInput } from "./types";

function scanDesignations(input: AuditInput, keywords: readonly string[]): boolean {
  const haystack = normalize(
    input.ingredients.map((i) => i.designation).join(" | ")
  );
  return keywords.some((k) => haystack.includes(k));
}

/** True if any ingredient is flagged Camellia, or a designation scan finds tea. */
function detectContientThe(input: AuditInput): boolean {
  if (input.ingredients.some((i) => i.estCamellia)) return true;
  return scanDesignations(input, CAMELLIA_KEYWORDS);
}

/** True if the product flag is set, or a designation scan finds licorice. */
/**
 * Le produit est-il une infusion — c'est-à-dire sans thé nulle part ?
 *
 * `contientThe` ne regarde que les désignations de la recette, qui portent des
 * codes fournisseur (« SORWATHE OP1 ») : un thé y passe inaperçu. Pour décider
 * si le §1.3 s'applique, on élargit à la liste déclarée et à la dénomination,
 * là où le thé est nommé en clair.
 *
 * Volontairement séparé de `contientThe` : élargir celui-ci rendrait le point
 * 1.1 applicable partout, et il conclurait « 0 % de Camellia » — une
 * non-conformité inventée, faute d'un marqueur jamais renseigné.
 */
function detectInfusion(input: AuditInput): boolean {
  if (detectContientThe(input)) return false;
  const texte = normalize(
    [
      input.fiche.ingredientsFr ?? "",
      input.fiche.denominationLegale ?? "",
      input.produit.denominationFr ?? "",
      input.produit.typeTheFr ?? "",
    ].join(" | ")
  );
  return !CAMELLIA_KEYWORDS.some((k) => texte.includes(k));
}

function detectContientReglisse(input: AuditInput): boolean {
  if (input.produit.contientReglisse === true) return true;
  return scanDesignations(input, REGLISSE_KEYWORDS);
}

export function buildAuditContext(input: AuditInput): AuditContext {
  const { fiche, produit } = input;
  return {
    typeTheFr: produit.typeTheFr ?? null,
    contientThe: detectContientThe(input),
    estInfusion: detectInfusion(input),
    estAromatise: produit.estAromatise ?? false,
    // No backing data yet — keeps DENOM_PARFUME non-applicable (manual lane).
    estParfumeEnfleurage: false,
    ingredients: fiche.ingredientsFr ?? null,
    allergenes: fiche.allergenes ?? null,
    allergeneMatiere: allergeneMatierePresent(produit.allergenesMp),
    allegationsSanteFr: fiche.allegationsSanteFr ?? null,
    contientReglisse: detectContientReglisse(input),
    // No backing data yet — surface/origin controls stay manual or LLM.
    surfaceFacePrincipaleCm2: null,
    origineMpUnique: undefined,
  };
}
