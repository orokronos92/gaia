/**
 * UI state model for the QUID ingredient calculator (SPEC-03b §2).
 *
 * These types describe Marie's editable working state. The regulatory figures
 * themselves still come exclusively from `computeRecette` (SPEC-02) — this state
 * is the *input* she manipulates, converted to kg before it reaches the agent.
 */

/** Active input unit (global toggle). */
export type UnitMode = "kg" | "pct";

/** Label rounding step — mirrors `PrecisionArrondi` from the recette engine. */
export type Pas = 0.5 | 1;

export type ProvenanceLigne = "EXTRAIT" | "AJOUTE_MARIE";

export interface LigneIngredient {
  /** Local uuid (added lines) or DB id. */
  id: string;
  /** null when Marie adds a free ingredient with no article code. */
  codeArticle: string | null;
  designation: string;
  /** Entered OR derived from `pourcentageSaisi`. */
  quantiteKg: number | null;
  /** Entered OR derived from `quantiteKg`. */
  pourcentageSaisi: number | null;
  estDemeter: boolean;
  estEquitable: boolean;
  provenance: ProvenanceLigne;
  /** true when no quantity is known (neither kg nor %). Blocks global compute. */
  incomplet: boolean;
}

export interface EtatCalculatrice {
  /** Pivot for the % <-> kg conversion (e.g. 16.08). null = % pur. */
  masseLotKg: number | null;
  /** Default 'pct' — the dégustation sheet speaks in percentages. */
  unitMode: UnitMode;
  /** Default 0.5. */
  pas: Pas;
  lignes: LigneIngredient[];
}
