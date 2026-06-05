/**
 * Field-level provenance — the transverse contract that tells Marie what to do
 * with a value: verify it (EXTRAIT), validate it (CALCULE) or trust it (VALIDE).
 *
 * North star: Marie verifies, she does not re-enter data. Provenance makes that
 * contract visible field by field across the whole label workflow.
 */

export type Provenance = "EXTRAIT" | "CALCULE" | "VALIDE";

export interface ValeurTracee<T> {
  valeur: T;
  provenance: Provenance;
  /** Raw source for comparison (e.g. original Word text) — shown on hover. */
  source?: string;
}
