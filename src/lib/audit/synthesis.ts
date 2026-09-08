/**
 * Lane-agnostic synthesis of control results. A manual "à vérifier" (WARNING)
 * is intentionally NOT a FAIL — it downgrades the overall status to WARNING, it
 * doesn't block. NA is ignored for the overall verdict.
 */

import { CONTROL_STATUSES, type ControlStatus } from "./types";

/** Anything carrying a status — works for both data and visual lane results. */
type Statused = { statut: ControlStatus };

/** Worst-wins overall status: FAIL > WARNING > PASS; NA-only → NA. */
export function overallStatus(results: readonly Statused[]): ControlStatus {
  if (results.some((r) => r.statut === "FAIL")) return "FAIL";
  if (results.some((r) => r.statut === "WARNING")) return "WARNING";
  if (results.some((r) => r.statut === "PASS")) return "PASS";
  return "NA";
}

/** Count of results per status (every status key present, zero-filled). */
export function countByStatus(results: readonly Statused[]): Record<ControlStatus, number> {
  const counts = Object.fromEntries(CONTROL_STATUSES.map((s) => [s, 0])) as Record<ControlStatus, number>;
  for (const r of results) counts[r.statut] += 1;
  return counts;
}

/**
 * Le verdict que la Qualité lit en tête d'écran.
 *
 * `overallStatus` répond à « qu'a trouvé la mesure » — il prend le pire statut
 * et n'en démord pas. C'est juste pour un rapport, faux pour une liste de
 * travail : une fois Marie passée sur chaque ligne, l'écran continuait
 * d'afficher « non conforme » à côté de « 0 anomalie ». Les deux chiffres ne
 * lisaient pas la même colonne — l'un le constat, l'autre le travail restant.
 *
 * Ce verdict-ci répond à « où en est-on », donc il lit l'action. Avec une
 * nuance à laquelle je tiens : **une dérogation n'est pas une conformité.**
 * Si l'Eurofeuille mesure 12,78 mm et que la Qualité l'assume, l'étiquette est
 * *acceptée*, pas *conforme*. Afficher « conforme » tout court effacerait sa
 * décision — et c'est précisément la trace dont elle a besoin si quelqu'un
 * revient dessus dans deux ans.
 */
export const VERDICTS_CHECKLIST = [
  "NON_CONFORME",
  "TRAVAIL_RESTANT",
  "CONFORME_SOUS_DEROGATION",
  "CONFORME",
  "SANS_OBJET",
] as const;

export type VerdictChecklist = (typeof VERDICTS_CHECKLIST)[number];

/** Ce qu'il faut pour trancher : l'action restante et la décision portée. */
type Verdictable = {
  statut: ControlStatus;
  action?: "RIEN" | "COMPLETER" | "VERIFIER" | "CORRIGER";
  validation?: { decision: "VERIFIE" | "DEROGATION"; perimee: boolean };
};

export interface SyntheseChecklist {
  verdict: VerdictChecklist;
  /** Dérogations en vigueur — elles doivent rester comptées et visibles. */
  derogations: number;
}

export function verdictChecklist(results: readonly Verdictable[]): SyntheseChecklist {
  const applicables = results.filter((r) => r.statut !== "NA");
  const derogations = applicables.filter(
    (r) => r.validation?.decision === "DEROGATION" && !r.validation.perimee
  ).length;

  if (applicables.length === 0) return { verdict: "SANS_OBJET", derogations: 0 };

  const restant = (r: Verdictable) => (r.action ?? "VERIFIER") !== "RIEN";

  // Une non-conformité encore ouverte garde le rouge : la perdre dans un
  // « travail restant » orange serait une régression de lisibilité.
  if (applicables.some((r) => restant(r) && r.action === "CORRIGER")) {
    return { verdict: "NON_CONFORME", derogations };
  }
  if (applicables.some(restant)) return { verdict: "TRAVAIL_RESTANT", derogations };

  return {
    verdict: derogations > 0 ? "CONFORME_SOUS_DEROGATION" : "CONFORME",
    derogations,
  };
}
