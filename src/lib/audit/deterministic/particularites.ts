/**
 * Deterministic "particularités" controls (PRO-QHS-013 §3). Applicability is
 * gated upstream by the registry predicates; these run only when the point
 * applies. The highlight/visual part stays a manual BAT check.
 */

import {
  allergeneMatierePresent,
  declareAllergeneFiche,
  MENTION_REGLISSE_TOKENS,
  normalize,
} from "../canonical";
import type { AuditInput, DeterministicVerdict } from "../types";

/**
 * 5.1 — ALLERGEN. Cross-checks the raw material against the label declaration.
 * The dangerous case is an allergen flagged on the matière première
 * (produits.allergenesMp = "oui") that is NOT declared on the fiche → FAIL.
 * When declared, presence is satisfied and the bold/underline emphasis stays a
 * visual BAT check.
 */
export function checkAllergen(input: AuditInput): DeterministicVerdict {
  const declareFiche = declareAllergeneFiche(input.fiche.allergenes);
  const matiere = allergeneMatierePresent(input.produit.allergenesMp);

  if (matiere && !declareFiche) {
    return {
      statut: "FAIL",
      justification:
        "Allergène signalé sur la matière première mais non déclaré sur l'étiquette.",
      suggestionIa: "Déclarer l'allergène dans la liste d'ingrédients et le mettre en évidence (gras).",
    };
  }
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
