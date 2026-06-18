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
  /** Manual override of the computed label % (Marie has the final say, SPEC-02). */
  overrideEtiquette: number | null;
  estDemeter: boolean;
  estEquitable: boolean;
  /** Marie hides this ingredient's % on the printed label (industrial secret). Display-only — the real % is still computed/stored. */
  masquerEtiquette: boolean;
  provenance: ProvenanceLigne;
  /** true when no quantity is known (neither kg nor %). Blocks global compute. */
  incomplet: boolean;
}

/** Non-binding AI proposal for a missing quantity (SPEC-03b §6). */
export interface SuggestionLigne {
  quantiteKg: number;
  confiance: "FAIBLE" | "MOYENNE" | "FORTE";
}

export interface EtatCalculatrice {
  /**
   * Mass (kg) of the PRINCIPAL ingredient — the one with the highest %, usually
   * the tea (SPEC-03b, decision 2026-06). Marie knows this (e.g. 10 kg); the
   * total lot mass is DERIVED from it + the percentages, never entered directly.
   */
  massePrincipaleKg: number | null;
  /** Default 'pct' — the dégustation sheet speaks in percentages. */
  unitMode: UnitMode;
  /** Default 0.5. */
  pas: Pas;
  lignes: LigneIngredient[];
}
