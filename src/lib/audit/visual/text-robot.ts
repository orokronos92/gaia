/**
 * Visual audit — text robot (deterministic layer).
 *
 * Compares the text printed on the BAT (all faces concatenated) against the
 * validated fiche. Pure and DB-free: the orchestrator extracts the BAT text
 * (lib/utils/bat-text) and hands it here with the fiche fields.
 *
 * Deterministic by design — it never rewrites the fiche, it only checks whether
 * each expected element is actually present/identical on the artwork. The LLM
 * pass (later lot) only judges the subtle wording cases this layer leaves open.
 *
 * Verdict rule: a factual divergence (a declared ingredient/% not found) is a
 * FAIL; a mandatory mention not found on the analysed faces is a WARNING (it may
 * live elsewhere on the pack) — never a silent PASS.
 */

import { FABRICANT_JDG_TOKENS, normalize } from "../canonical";
import type { ControlStatus } from "../types";

/** JDG mandatory conservation mention — invariant tokens. */
const CONSERVATION_TOKENS = ["abri", "humidite", "lumiere", "chaleur"] as const;

export interface BatTextInput {
  denomination?: string | null;
  ingredients?: string | null;
  allegation?: string | null;
  allergenes?: string | null;
  poidsNet?: string | null;
  codeEtiquette?: string | null;
  mentionConservation?: string | null;
  mentionFabricant?: string | null;
}

export interface BatTextCheck {
  id: string;
  rubrique: string;
  libelle: string;
  statut: ControlStatus;
  justification: string;
}

/** Normalize for comparison: fold case/accents/space AND glue number+unit. */
function normCmp(value: string): string {
  return normalize(value).replace(/(\d)\s*(g|kg|mg|ml|cl|%)/gi, "$1$2");
}

function declares(value?: string | null): boolean {
  if (!value) return false;
  const n = normalize(value);
  return n !== "" && n !== "non" && n !== "aucun" && n !== "aucune";
}

/** Ingredient list + percentages must appear verbatim on the artwork. */
function checkIngredients(batN: string, input: BatTextInput): BatTextCheck {
  const base = { id: "TXT_INGREDIENTS", rubrique: "Liste des ingrédients", libelle: "Liste d'ingrédients et % conformes à la fiche ?" };
  if (!input.ingredients || input.ingredients.trim() === "") {
    return { ...base, statut: "WARNING", justification: "Liste d'ingrédients absente de la fiche — comparaison impossible." };
  }
  // Split on list separators (comma + space) only, so French decimals (15,5%) survive.
  const items = input.ingredients.split(/,\s+/).map((s) => s.trim()).filter(Boolean);
  const missing = items.filter((it) => !batN.includes(normCmp(it)));
  if (missing.length === 0) {
    return { ...base, statut: "PASS", justification: "Tous les ingrédients et % de la fiche figurent sur le BAT." };
  }
  return {
    ...base,
    statut: "FAIL",
    justification: `Non retrouvé(s) à l'identique sur le BAT : ${missing.join(" ; ")}.`,
  };
}

/** Presence of a single fiche string on the artwork. */
function checkPresence(
  batN: string,
  value: string | null | undefined,
  cfg: { id: string; rubrique: string; libelle: string; absent: string }
): BatTextCheck {
  const base = { id: cfg.id, rubrique: cfg.rubrique, libelle: cfg.libelle };
  if (!value || value.trim() === "") {
    return { ...base, statut: "WARNING", justification: "Donnée absente de la fiche — non vérifiable." };
  }
  if (batN.includes(normCmp(value))) {
    return { ...base, statut: "PASS", justification: `« ${value.trim()} » présent sur le BAT.` };
  }
  return { ...base, statut: "WARNING", justification: cfg.absent };
}

/** Presence of every invariant token of a mandatory JDG mention. */
function checkTokens(
  batN: string,
  tokens: readonly string[],
  cfg: { id: string; rubrique: string; libelle: string; absent: string }
): BatTextCheck {
  const base = { id: cfg.id, rubrique: cfg.rubrique, libelle: cfg.libelle };
  if (tokens.every((t) => batN.includes(t))) {
    return { ...base, statut: "PASS", justification: "Mention présente sur le BAT." };
  }
  return { ...base, statut: "WARNING", justification: cfg.absent };
}

/** Runs the deterministic text robot over the concatenated BAT text. */
export function runTextRobot(batText: string, input: BatTextInput): BatTextCheck[] {
  const batN = normCmp(batText);
  const results: BatTextCheck[] = [
    checkIngredients(batN, input),
    checkPresence(batN, input.denomination, {
      id: "TXT_DENOMINATION", rubrique: "Dénomination", libelle: "Dénomination présente sur le BAT ?",
      absent: "Dénomination non retrouvée sur les faces analysées — à vérifier.",
    }),
    checkPresence(batN, input.poidsNet, {
      id: "TXT_POIDS_NET", rubrique: "Quantité nette", libelle: "Poids net présent sur le BAT ?",
      absent: "Poids net non retrouvé sur les faces analysées — à vérifier.",
    }),
    checkPresence(batN, input.codeEtiquette, {
      id: "TXT_CODE_ETIQUETTE", rubrique: "Code étiquette", libelle: "Code étiquette présent sur le BAT ?",
      absent: "Code étiquette non retrouvé sur les faces analysées — à vérifier.",
    }),
    checkTokens(batN, CONSERVATION_TOKENS, {
      id: "TXT_CONSERVATION", rubrique: "Conservation", libelle: "Mention de conservation présente sur le BAT ?",
      absent: "Mention de conservation JDG non retrouvée sur les faces analysées — à vérifier.",
    }),
    checkTokens(batN, FABRICANT_JDG_TOKENS, {
      id: "TXT_FABRICANT", rubrique: "Fabricant", libelle: "Adresse fabricant présente sur le BAT ?",
      absent: "Adresse fabricant JDG non retrouvée sur les faces analysées — à vérifier.",
    }),
  ];

  // The allegation is deliberately NOT a deterministic check: its wording on the
  // label differs from the fiche libellé (fiche "Tonifiant / vitalité" vs label
  // "STIMULANT & TONIQUE" + "Consommation journalière… 3 tasses"). Exact match
  // produces false warnings — judging that equivalence is the LLM's job, and the
  // graphic emphasis the visual robot's. Handled in a later lot (input.allegation
  // is kept for them).
  if (declares(input.allergenes)) {
    results.push(checkPresence(batN, input.allergenes, {
      id: "TXT_ALLERGENES", rubrique: "Particularités", libelle: "Allergènes déclarés présents sur le BAT ?",
      absent: "Allergène déclaré sur la fiche mais non retrouvé sur le BAT — à vérifier.",
    }));
  }

  return results;
}
