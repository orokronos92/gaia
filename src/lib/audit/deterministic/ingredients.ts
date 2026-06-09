/**
 * Deterministic ingredient-list controls (PRO-QHS-013 §2.1). Order and
 * mono-ingredient checks read the recette; the mention check reads the label
 * text. Absent data → WARNING (never a silent PASS).
 */

import { normalize } from "../canonical";
import type { AuditInput, DeterministicVerdict } from "../types";

/** 2.1 — INGR_MENTION: the word "ingrédients" precedes the list. */
export function checkIngrMention(input: AuditInput): DeterministicVerdict {
  const texte = input.fiche.ingredientsFr;
  if (!texte || texte.trim() === "") {
    return { statut: "WARNING", justification: "Liste d'ingrédients absente de la fiche." };
  }
  if (normalize(texte).includes("ingredient")) {
    return { statut: "PASS", justification: "Mention « ingrédients » présente." };
  }
  return {
    statut: "WARNING",
    justification: "Mention « ingrédients » non détectée dans le texte enregistré — à confirmer sur le BAT.",
    suggestionIa: "Préfixer la liste par « Ingrédients : ».",
  };
}

/** 2.2 — INGR_ORDRE_DECROISSANT: descending weight order along ordreTri. */
export function checkIngrOrdreDecroissant(input: AuditInput): DeterministicVerdict {
  if (input.ingredients.length === 0) {
    return { statut: "WARNING", justification: "Aucune recette : ordre non vérifiable." };
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
    return { statut: "WARNING", justification: "Aucune recette : cas mono-ingrédient non vérifiable." };
  }
  return {
    statut: "WARNING",
    justification: "Mono-ingrédient : vérifier que la liste est correctement omise (dénomination = nom de l'ingrédient).",
  };
}
