/**
 * Deterministic ingredient-list controls (PRO-QHS-013 §2.1). Order and
 * mono-ingredient checks read the recette. The "Ingrédients :" prefix check
 * (2.1) is NOT here: it's a manual BAT control, since the prefix is label
 * decoration and not a stored field. Absent data → WARNING (never a silent PASS).
 */

import type { AuditInput, DeterministicVerdict } from "../types";

/** 2.2 — INGR_ORDRE_DECROISSANT: descending weight order along ordreTri. */
export function checkIngrOrdreDecroissant(input: AuditInput): DeterministicVerdict {
  if (input.ingredients.length === 0) {
    return { statut: "WARNING", action: "COMPLETER", justification: "Aucune recette : ordre non vérifiable." };
  }
  const tries = [...input.ingredients].sort((a, b) => a.ordreTri - b.ordreTri);
  for (let i = 1; i < tries.length; i++) {
    if (tries[i].pourcentageBrut > tries[i - 1].pourcentageBrut + 1e-6) {
      return {
        statut: "FAIL",
        justification: `Ordre non décroissant : « ${tries[i].designation} » (${tries[i].pourcentageBrut} %) après « ${tries[i - 1].designation} » (${tries[i - 1].pourcentageBrut} %).`,
      };
    }
  }
  return { statut: "PASS", justification: "Ingrédients par ordre pondéral décroissant." };
}

/** 2.3 — INGR_MONO: mono-ingredient list omission. NA when multi-ingredient. */
export function checkIngrMono(input: AuditInput): DeterministicVerdict {
  if (input.ingredients.length > 1) {
    return { statut: "NA", justification: "Produit multi-ingrédients." };
  }
  if (input.ingredients.length === 0) {
    return { statut: "WARNING", action: "COMPLETER", justification: "Aucune recette : cas mono-ingrédient non vérifiable." };
  }
  return {
    statut: "WARNING",
    justification: "Mono-ingrédient : vérifier que la liste est correctement omise (dénomination = nom de l'ingrédient).",
  };
}
