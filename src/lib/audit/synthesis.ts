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
