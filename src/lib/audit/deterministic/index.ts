/**
 * Deterministic lane (Voie A) — runs every `deterministic` control point with
 * pure code, validates each verdict with Zod, and returns ControlResults.
 * Reproducible, network-free, zero LLM. NA is decided here via the registry
 * applicability predicate, so the output lists every deterministic point.
 */

import { buildAuditContext } from "../build-context";
import { CONTROL_CHECKLIST } from "../control-checklist";
import {
  ControlResultSchema,
  actionParDefaut,
  type AuditContext,
  type AuditInput,
  type ControlPoint,
  type ControlResult,
  type DeterministicVerdict,
} from "../types";
import {
  checkCodeConditionnement,
  checkCodePoidsCoherent,
  checkGencodeCoherent,
  checkGencodeUnicite,
} from "./code-article";
import { checkIngrMono, checkIngrOrdreDecroissant } from "./ingredients";
import {
  checkCodeEtiquette,
  checkConservationMention,
  checkFabricantAdresse,
  checkQteNetteUnite,
} from "./mentions";
import { checkAllergen, checkReglisse } from "./particularites";
import { checkDenomThe51, checkQuid, checkQuidAjustement100, checkRounding } from "./quid";

type CheckFn = (input: AuditInput) => DeterministicVerdict;

/** Registry id → deterministic check. Keys must stay in sync with the checklist. */
const CHECKS: Record<string, CheckFn> = {
  "1.1": checkDenomThe51,
  // 2.1 (INGR_MENTION) is manual now — the "Ingrédients :" prefix is BAT-only,
  // not stored data. See control-checklist.ts.
  "2.2": checkIngrOrdreDecroissant,
  "2.3": checkIngrMono,
  "3.1": checkQuid,
  "3.2": checkRounding,
  "3.3": checkQuidAjustement100,
  "5.1": checkAllergen,
  "5.3": checkReglisse,
  "6.1": checkQteNetteUnite,
  "7.2": checkConservationMention,
  "9.1": checkFabricantAdresse,
  // 10.1 (gencode) and 13.2 (code OC) are BAT controls now — not in the fiche.
  // Vision-eligible (visual robot), out of the deterministic lane. See
  // control-checklist.ts.
  "15.1": checkCodeEtiquette,
  // 16.x — code article et Gencode (MOP-PRO-029). Contrôles sur la fiche : le
  // code-barres IMPRIMÉ sur le BAT reste le point 10.1, manuel.
  "16.1": checkCodeConditionnement,
  "16.2": checkCodePoidsCoherent,
  "16.3": checkGencodeCoherent,
  "16.4": checkGencodeUnicite,
};

function evaluate(control: ControlPoint, input: AuditInput, ctx: AuditContext): ControlResult {
  const base = { id: control.id, typeControle: control.typeControle, mode: control.mode };
  if (control.applicableSi && !control.applicableSi(ctx)) {
    return ControlResultSchema.parse({
      ...base,
      statut: "NA",
      action: "RIEN",
      justification: "Non applicable à ce produit.",
    });
  }
  const fn = CHECKS[control.id];
  const verdict: DeterministicVerdict = fn
    ? fn(input)
    : { statut: "WARNING", justification: "Contrôle déterministe non implémenté." };
  // Le contrôle précise l'action quand le statut seul ne dit pas le geste
  // attendu ; sinon on la déduit.
  return ControlResultSchema.parse({
    ...base,
    ...verdict,
    action: verdict.action ?? actionParDefaut(verdict.statut),
  });
}

/** Runs the deterministic checks among the given control points. */
export function runDeterministicLane(
  controls: ControlPoint[],
  input: AuditInput,
  ctx: AuditContext
): ControlResult[] {
  return controls
    .filter((c) => c.mode === "deterministic")
    .map((c) => evaluate(c, input, ctx));
}

/** Public Voie A entrypoint: builds the context and runs the full deterministic lane. */
export function auditDeterministic(input: AuditInput): ControlResult[] {
  const ctx = buildAuditContext(input);
  return runDeterministicLane(CONTROL_CHECKLIST, input, ctx);
}
