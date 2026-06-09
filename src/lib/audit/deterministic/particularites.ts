/**
 * Deterministic "particularités" controls (PRO-QHS-013 §3). Applicability is
 * gated upstream by the registry predicates; these run only when the point
 * applies. The highlight/visual part stays a manual BAT check.
 */

import { MENTION_REGLISSE_TOKENS, normalize } from "../canonical";
import type { AuditInput, DeterministicVerdict } from "../types";

/**
 * 5.1 — ALLERGEN. Reached only when allergens are declared on the fiche. The
 * declaration's presence is satisfied; the bold/underline emphasis is visual.
 *
 * NOTE (debt): an UNDECLARED allergen (produit.allergenesMp = "oui" while the
 * fiche field is empty) currently slips to NA via the registry predicate. A
 * dedicated guard is needed — flagged for Ouro.
 */
export function checkAllergen(): DeterministicVerdict {
  return {
    statut: "PASS",
    justification: "Allergène déclaré sur la fiche ; mise en évidence (gras/souligné) à vérifier sur le BAT.",
  };
}

/** 5.3 — REGLISSE. Reached only when licorice is present; the JDG hypertension
 * mention is not stored as a field, so it can only be confirmed on the BAT. */
export function checkReglisse(input: AuditInput): DeterministicVerdict {
  const texte = input.fiche.ingredientsFr ?? "";
  const normalized = normalize(texte);
  const mentionPresente = MENTION_REGLISSE_TOKENS.every((t) => normalized.includes(t));
  if (mentionPresente) {
    return { statut: "PASS", justification: "Mention réglisse/hypertension détectée." };
  }
  return {
    statut: "WARNING",
    justification: "Réglisse présente : mention JDG « Contient de la réglisse – hypertension » à confirmer sur le BAT.",
    suggestionIa:
      "Ajouter « Contient de la réglisse – Les personnes souffrant d'hypertension doivent éviter toute consommation excessive ».",
  };
}
