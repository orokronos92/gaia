/**
 * Deterministic QUID / Camellia controls — adossés au moteur `computeRecette`
 * (golden MT265). The LLM never produces these figures; the engine is the
 * single source of truth (PRO-QHS-013 §2.2).
 */

import {
  computeRecette,
  type IngredientRecetteInput,
  type PrecisionArrondi,
} from "@/lib/business-rules/recette";
import type { AuditInput, DeterministicVerdict } from "../types";

const SEUIL_THE = 51; // §1.1 — ≥ 51 % Camellia to be called "thé"
const CIBLE_TOTAL = 100;
const EPSILON = 0.01;
const PRECISIONS: PrecisionArrondi[] = [0.5, 1];

function toRecetteInput(input: AuditInput): IngredientRecetteInput[] {
  return input.ingredients.map((i) => ({
    codeArticle: i.codeArticle,
    designation: i.designation,
    quantiteKg: i.quantiteKg,
    estDemeter: i.estDemeter,
    estEquitable: i.estEquitable,
  }));
}

/** 1.1 — DENOM_THE_51: ≥ 51 % Camellia sinensis by weight. */
export function checkDenomThe51(input: AuditInput): DeterministicVerdict {
  if (input.ingredients.length === 0) {
    return { statut: "WARNING", justification: "Aucune recette : % Camellia non calculable." };
  }
  const totalKg = input.ingredients.reduce((s, i) => s + i.quantiteKg, 0);
  const camelliaKg = input.ingredients
    .filter((i) => i.estCamellia)
    .reduce((s, i) => s + i.quantiteKg, 0);
  const pct = totalKg > 0 ? (camelliaKg / totalKg) * 100 : 0;
  const pctArrondi = Math.round(pct * 10) / 10;
  if (pct >= SEUIL_THE) {
    return { statut: "PASS", justification: `Camellia sinensis à ${pctArrondi} % (≥ 51 %).` };
  }
  return {
    statut: "FAIL",
    justification: `Dénomination « thé » mais seulement ${pctArrondi} % de Camellia sinensis (< 51 %).`,
    suggestionIa: "Revoir la dénomination de vente (ex. « mélange » / « infusion ») ou la composition.",
  };
}

/**
 * 3.1 — QUID: a percentage is declared for every listed ingredient.
 *
 * DECISION (Ouro, 2026-06-09): JDG declares a % for ALL ingredients, so we
 * require one for each — stricter than INCO art. 22, which only mandates QUID
 * for ingredients in the denomination / graphically highlighted / source of
 * confusion. Do NOT "fix" this to the INCO minimum: it's the validated JDG rule.
 *
 * MASKING (Ouro, 2026-06-18): Marie may hide some ingredients' % on the label
 * (industrial secret) via `pourcentageMasque`. That is a deliberate, Quality-
 * validated omission, NOT a missing-% error → it is a WARNING (an explicit trace
 * for review), never a FAIL. The real % still lives in pourcentageEtiquette, so
 * 3.2 (rounding) and 3.3 (Σ=100) keep computing on the full set, untouched.
 */
export function checkQuid(input: AuditInput): DeterministicVerdict {
  if (input.ingredients.length === 0) {
    return { statut: "WARNING", justification: "Aucune recette : QUID non vérifiable." };
  }
  // A real error: an ingredient with no % that Marie did NOT choose to mask.
  const manquants = input.ingredients.filter(
    (i) => !i.pourcentageMasque && !(i.pourcentageEtiquette > 0)
  );
  if (manquants.length > 0) {
    return {
      statut: "FAIL",
      justification: `${manquants.length} ingrédient(s) sans % déclaré : ${manquants
        .map((i) => i.designation)
        .join(", ")}.`,
    };
  }
  const masques = input.ingredients.filter((i) => i.pourcentageMasque);
  if (masques.length > 0) {
    return {
      statut: "WARNING",
      justification: `${masques.length} ingrédient(s) volontairement sans % sur l'étiquette (secret industriel, à confirmer par la Qualité) : ${masques
        .map((i) => i.designation)
        .join(", ")}.`,
    };
  }
  return { statut: "PASS", justification: "Un % est déclaré pour chaque ingrédient." };
}

/** 3.2 — ROUNDING: stored label % reproduce the engine's largest-remainder result. */
export function checkRounding(input: AuditInput): DeterministicVerdict {
  if (input.ingredients.length === 0) {
    return { statut: "WARNING", justification: "Aucune recette : arrondi non vérifiable." };
  }
  const stored = input.ingredients.map((i) => i.pourcentageEtiquette);
  const recetteInput = toRecetteInput(input);

  for (const precision of PRECISIONS) {
    const calc = computeRecette({ ingredients: recetteInput, precisionArrondi: precision });
    const reproduces = calc.ingredients.every(
      (ing, i) => Math.abs(ing.pourcentageEtiquette - stored[i]) < EPSILON
    );
    if (reproduces) {
      return {
        statut: "PASS",
        justification: `Arrondi conforme (pas de ${precision}, méthode du plus grand reste, Σ = 100).`,
      };
    }
  }

  const attendu = computeRecette({ ingredients: recetteInput, precisionArrondi: 0.5 })
    .ingredients.map((i) => i.pourcentageEtiquette)
    .join(" / ");
  return {
    statut: "FAIL",
    justification: `Arrondi non conforme. Attendu (pas 0,5) : ${attendu}. Sur l'étiquette : ${stored.join(" / ")}.`,
    suggestionIa: "Recalculer les % via le moteur (méthode du plus grand reste).",
  };
}

/** 3.3 — QUID_AJUSTEMENT_100: declared percentages sum to exactly 100. */
export function checkQuidAjustement100(input: AuditInput): DeterministicVerdict {
  if (input.ingredients.length === 0) {
    return { statut: "WARNING", justification: "Aucune recette : total non vérifiable." };
  }
  const total = input.ingredients.reduce((s, i) => s + i.pourcentageEtiquette, 0);
  const totalArrondi = Math.round(total * 100) / 100;
  if (Math.abs(total - CIBLE_TOTAL) < EPSILON) {
    return { statut: "PASS", justification: "Total des % étiquette = 100." };
  }
  return {
    statut: "FAIL",
    justification: `Total des % étiquette = ${totalArrondi} (attendu 100).`,
    suggestionIa: "Reporter l'écart d'arrondi sur l'ingrédient le plus important.",
  };
}
