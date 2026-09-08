/**
 * La checklist complète de Marie — les 39 points, sans exception.
 *
 * L'écran d'audit n'est pas un rapport de conformité, c'est **sa liste de
 * travail** : elle doit y voir tout ce qui reste à faire sur cette fiche et ses
 * BAT. Jusqu'ici seuls les 16 points déterministes s'affichaient ; les 10 points
 * LLM et les 13 contrôles visuels étaient déclarés au registre et ne produisaient
 * rien. Marie voyait seize lignes vertes et pouvait croire que tout avait été
 * vérifié — un contrôle absent est un oubli, un contrôle muet est un mensonge
 * par omission.
 *
 * Trois états, comme le veut le métier :
 *   information absente        → COMPLETER  (remplir la fiche)
 *   présente mais à confirmer  → VERIFIER   (regarder, trancher)
 *   présente et vérifiée       → RIEN
 * plus la non-conformité prouvée → CORRIGER.
 */

import { getApplicableControls } from "./control-checklist";
import { runDeterministicLane } from "./deterministic";
import { buildAuditContext } from "./build-context";
import {
  ControlResultSchema,
  type AuditInput,
  type ControlPoint,
  type ControlResult,
} from "./types";

/**
 * Ce qu'un point non exécuté doit dire à Marie. Il ne prétend pas juger : il
 * annonce qui doit le faire, et ce qu'il faut regarder.
 */
function pointNonExecute(control: ControlPoint): ControlResult {
  const justification =
    control.mode === "bat"
      ? // Mesuré dès qu'un BAT est associé. Sans constat, c'est que le produit
        // n'en a pas, ou qu'aucune face n'était lisible — et il faut le dire,
        // plutôt que réclamer un contrôle visuel que le code sait faire.
        "Se mesure sur le BAT — aucun constat pour l'instant : BAT absent ou face illisible."
      : control.mode === "manual"
        ? "Contrôle visuel sur le BAT — à confirmer par la Qualité."
        : "Non évalué automatiquement — à confirmer par la Qualité.";

  return ControlResultSchema.parse({
    id: control.id,
    typeControle: control.typeControle,
    mode: control.mode,
    statut: "WARNING",
    action: "VERIFIER",
    justification,
  });
}

/**
 * Tous les points applicables, chacun avec son verdict ou, à défaut, ce qu'il
 * reste à faire. Un point inapplicable au produit reste `NA` et sort de la
 * liste de travail sans disparaître du registre.
 */
export function construireChecklist(input: AuditInput): ControlResult[] {
  const ctx = buildAuditContext(input);
  const applicables = getApplicableControls(ctx);

  const deterministes = runDeterministicLane(applicables, input, ctx);
  const dejaEvalues = new Set(deterministes.map((r) => r.id));

  const restants = applicables
    .filter((c) => !dejaEvalues.has(c.id))
    .map(pointNonExecute);

  return [...deterministes, ...restants].sort((a, b) => {
    const oa = applicables.find((c) => c.id === a.id)?.ordre ?? 0;
    const ob = applicables.find((c) => c.id === b.id)?.ordre ?? 0;
    return oa - ob;
  });
}

export interface ResteAFaire {
  corriger: number;
  completer: number;
  verifier: number;
  fait: number;
  nonApplicable: number;
}

/** Le décompte que Marie lit en tête d'écran. */
export function compterResteAFaire(results: ControlResult[]): ResteAFaire {
  const compte: ResteAFaire = {
    corriger: 0,
    completer: 0,
    verifier: 0,
    fait: 0,
    nonApplicable: 0,
  };
  for (const r of results) {
    if (r.statut === "NA") compte.nonApplicable += 1;
    else if (r.action === "CORRIGER") compte.corriger += 1;
    else if (r.action === "COMPLETER") compte.completer += 1;
    else if (r.action === "VERIFIER") compte.verifier += 1;
    else compte.fait += 1;
  }
  return compte;
}
