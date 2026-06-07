/**
 * Bidirectional kg <-> % conversion layer for the QUID calculator (SPEC-03b §3).
 *
 * This is a thin, pure, fully-testable layer placed UPSTREAM of the regulatory
 * engine. `computeRecette` (SPEC-02) stays the single source of truth for the
 * rounding/QUID rules and is NOT modified here. The only junction point with the
 * engine is `normaliserVersKg`, which produces the exact kg-based input it
 * expects, regardless of whether Marie typed kilograms or percentages.
 *
 * Pivot: `masseLotKg`. Note the asymmetry (documented for callers): kg -> % is
 * lossless, but % -> kg is only exact for *raw* percentages. Reconverting a
 * *rounded label* % (e.g. 62 instead of 62.189) yields an approximate grammage —
 * the rounding has destroyed information. The calculator treats kg as the source
 * of truth; %-entry produces display grammages, not a recovery of R&D's kg.
 */

import type { EtatCalculatrice, LigneIngredient } from "./types";
import type { IngredientRecetteInput } from "@/lib/business-rules/recette";

const POURCENTAGE = 100;

/** % -> kg, pivoting on the lot mass. Pure formula, unrounded. */
export function pctVersKg(pct: number, masseLotKg: number): number {
  return (pct / POURCENTAGE) * masseLotKg;
}

/** kg -> %, pivoting on the lot mass. Throws on a non-positive mass. */
export function kgVersPct(kg: number, masseLotKg: number): number {
  if (masseLotKg <= 0) {
    throw new Error("kgVersPct: la masse de lot doit être > 0");
  }
  return (kg / masseLotKg) * POURCENTAGE;
}

/** Highest entered % across lines (the principal ingredient), or 0. */
function maxPourcentage(etat: EtatCalculatrice): number {
  return etat.lignes.reduce(
    (m, l) => (l.pourcentageSaisi != null && l.pourcentageSaisi > m ? l.pourcentageSaisi : m),
    0
  );
}

/**
 * Derive the TOTAL lot mass (kg) — never entered directly (SPEC-03b).
 *  - kg mode: the lot is simply the sum of the entered quantities.
 *  - % mode:  the lot follows from the principal ingredient: if the principal
 *    weighs `massePrincipaleKg` and represents `maxPct` %, then
 *    lot = massePrincipaleKg × 100 / maxPct. Every other grammage is `% × lot`.
 * Returns null when not yet derivable.
 */
export function masseLotDe(etat: EtatCalculatrice): number | null {
  if (etat.unitMode === "kg") {
    const somme = etat.lignes.reduce((s, l) => s + (l.quantiteKg ?? 0), 0);
    return somme > 0 ? somme : null;
  }
  const mp = etat.massePrincipaleKg;
  const maxPct = maxPourcentage(etat);
  if (mp == null || mp <= 0 || maxPct <= 0) return null;
  return (mp * 100) / maxPct;
}

/**
 * Resolve a single line to kilograms according to the active input unit.
 * Throws on a line that cannot be resolved (incomplete, or % mode without a
 * derivable lot) — the caller guarantees no `incomplet` line before computing.
 */
function resoudreKg(
  ligne: LigneIngredient,
  etat: EtatCalculatrice,
  lot: number | null
): number {
  if (etat.unitMode === "kg") {
    if (ligne.quantiteKg == null) {
      throw new Error(
        `normaliserVersKg: ligne « ${ligne.designation} » sans quantité (kg)`
      );
    }
    return ligne.quantiteKg;
  }

  // unitMode === 'pct'
  if (ligne.pourcentageSaisi == null) {
    throw new Error(
      `normaliserVersKg: ligne « ${ligne.designation} » sans pourcentage`
    );
  }
  if (lot == null || lot <= 0) {
    throw new Error(
      "normaliserVersKg: masse de l'ingrédient principal requise pour convertir les % en kg"
    );
  }
  return pctVersKg(ligne.pourcentageSaisi, lot);
}

/**
 * Produce the EXACT input expected by `computeRecette` (SPEC-02), whatever the
 * input mode. This is the sole bridge to the engine. Free ingredients (no code)
 * are coerced to an empty code — their identity is preserved in the UI state,
 * not here. Throws if any line is unresolvable (see `resoudreKg`).
 */
export function normaliserVersKg(
  etat: EtatCalculatrice
): IngredientRecetteInput[] {
  const lot = masseLotDe(etat);
  return etat.lignes.map((ligne) => ({
    codeArticle: ligne.codeArticle ?? "",
    designation: ligne.designation,
    quantiteKg: resoudreKg(ligne, etat, lot),
    estDemeter: ligne.estDemeter,
    estEquitable: ligne.estEquitable,
  }));
}
