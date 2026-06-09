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
function detectContientReglisse(input: AuditInput): boolean {
  if (input.produit.contientReglisse === true) return true;
  return scanDesignations(input, REGLISSE_KEYWORDS);
}

export function buildAuditContext(input: AuditInput): AuditContext {
  const { fiche, produit } = input;
  return {
    typeTheFr: produit.typeTheFr ?? null,
    contientThe: detectContientThe(input),
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
