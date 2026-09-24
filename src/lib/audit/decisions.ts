/**
 * What Quality can decide on a control point. Pure, no crypto: the screen and
 * the fusion of BAT evidence read it on the client too.
 *
 * Two kinds, deliberately apart:
 *   - closing decisions — the point is done: checked (VERIFIE) or a divergence
 *     accepted in writing (DEROGATION, "arbitrer l'écart");
 *   - open ones — a divergence Quality has looked at and routed, still to be
 *     settled: the label is to be redone by Graphics (BAT_A_REFAIRE), or an
 *     answer is awaited from someone (EN_ATTENTE). The line stays in the
 *     worklist with a badge that says who holds it (decision 2026-09-24).
 */
export const DECISIONS = ["VERIFIE", "DEROGATION", "BAT_A_REFAIRE", "EN_ATTENTE"] as const;
export type Decision = (typeof DECISIONS)[number];

const DECISIONS_OUVERTES: readonly Decision[] = ["BAT_A_REFAIRE", "EN_ATTENTE"];

export const estDecisionOuverte = (d: Decision): boolean => DECISIONS_OUVERTES.includes(d);

/** A decision that closes the point: present, not stale, and not an open one. */
export function estTranche(v: { decision: Decision; perimee: boolean } | undefined): boolean {
  return v !== undefined && !v.perimee && !estDecisionOuverte(v.decision);
}
