/**
 * Audit type system — shared across the three execution lanes
 * (deterministic / llm / manual). Source of truth for the audit domain:
 * PRO-QHS-013 (Procédure de vérification d'étiquetage, v.1, 30/03/2023).
 *
 * Static control metadata (libellé, référence, section, ordre) lives in the
 * registry (`control-checklist.ts`). A `ControlResult` carries only the dynamic
 * verdict and is joined back to the registry by `id` — no duplication.
 */

import { z } from "zod";

/** Who evaluates a control point. The mode decides the executor — hard rule. */
export const CONTROL_MODES = ["deterministic", "llm", "manual"] as const;
export const ControlModeSchema = z.enum(CONTROL_MODES);
export type ControlMode = z.infer<typeof ControlModeSchema>;

/**
 * Verdict for a single control point.
 * `NA` = not applicable (predicate false). Engine/LLM failure surfaces as a
 * `WARNING` with an honest justification — never a fabricated PASS.
 */
export const CONTROL_STATUSES = ["PASS", "WARNING", "FAIL", "NA"] as const;
export const ControlStatusSchema = z.enum(CONTROL_STATUSES);
export type ControlStatus = z.infer<typeof ControlStatusSchema>;

/** Sections of PRO-QHS-013, in document order. */
export const CONTROL_SECTIONS = [
  "DENOMINATION",
  "INGREDIENTS",
  "QUID",
  "NUTRITION",
  "PARTICULARITES",
  "QUANTITE_NETTE",
  "CONSERVATION",
  "ORIGINE",
  "FABRICANT",
  "GENCODE",
  "METROLOGIE",
  "PICTOGRAMMES",
  "LABELS",
  "TYPOGRAPHIE",
  "CODE_ETIQUETTE",
] as const;
export const ControlSectionSchema = z.enum(CONTROL_SECTIONS);
export type ControlSection = z.infer<typeof ControlSectionSchema>;

/**
 * Stable business control types. Extends the legacy worker set
 * (QUID, ROUNDING, ALLEGATION, ALLERGEN, REGLISSE) to the full 35-point
 * checklist. The stable `id` ("1.0", "3.2"…) is the real identity — this enum
 * is descriptive metadata, not a DB primary key.
 */
export const CONTROL_TYPES = [
  "DENOM_LEGALE",
  "DENOM_THE_51",
  "DENOM_AROMATISE",
  "DENOM_PARFUME",
  "DENOM_CHAMP_VISUEL",
  "INGR_MENTION",
  "INGR_ORDRE_DECROISSANT",
  "INGR_MONO",
  "INGR_ETOILES_BIO",
  "QUID",
  "ROUNDING",
  "QUID_AJUSTEMENT_100",
  "NUTRITION_EXEMPTION",
  "NUTRITION_MENTION",
  "ALLERGEN",
  "ALLEGATION",
  "REGLISSE",
  "QTE_NETTE_UNITE",
  "QTE_NETTE_HAUTEUR",
  "CONSERVATION_MODE_EMPLOI",
  "CONSERVATION_MENTION",
  "ORIGINE_SOUS_CODE_OC",
  "ORIGINE_AGRICULTURE_98",
  "ORIGINE_VOLONTAIRE_50",
  "FABRICANT_ADRESSE",
  "GENCODE_STRUCTURE",
  "METRO_E_ABSENT",
  "TRIMAN",
  "INFOTRI",
  "EUROFEUILLE",
  "CODE_OC",
  "LABELS_NON_OFFICIELS",
  "POINT_VERT_ABSENT",
  "TYPO_HAUTEUR_X",
  "CODE_ETIQUETTE",
] as const;
export const ControlTypeSchema = z.enum(CONTROL_TYPES);
export type ControlType = z.infer<typeof ControlTypeSchema>;

/**
 * Minimal context passed to applicability predicates. A point whose
 * `applicableSi` returns false is auto-`NA` — never audited. Mirrors the fields
 * the regulation keys applicability on (PRO-QHS-013).
 */
export interface AuditContext {
  typeTheFr?: string | null;
  contientThe?: boolean; // at least one Camellia sinensis ingredient
  estAromatise?: boolean;
  estParfumeEnfleurage?: boolean;
  ingredients?: string | null;
  allergenes?: string | null; // declared on the fiche/label
  allergeneMatiere?: boolean; // raw material flags an allergen (produits.allergenesMp)
  allegationsSanteFr?: string | null;
  contientReglisse?: boolean;
  surfaceFacePrincipaleCm2?: number | null;
  origineMpUnique?: boolean; // > 50 % from a single origin
}

/** A control point in the checklist (static metadata + applicability). */
export interface ControlPoint {
  /** Stable business id, never changes (e.g. "3.2"). Primary identity. */
  id: string;
  /** Order in the procedure, for 1:1 display. */
  ordre: number;
  section: ControlSection;
  typeControle: ControlType;
  mode: ControlMode;
  /** FR label shown to Marie, phrased as a conformity question. */
  libelle: string;
  /** Regulatory / internal reference for traceability. */
  reference: string;
  /** Applicability predicate. Absent = always applicable. */
  applicableSi?: (ctx: AuditContext) => boolean;
}

/**
 * Dynamic verdict for one control point. Joined to the registry by `id` for
 * libellé/référence/section. Validated with Zod at every lane boundary so a
 * lane (incl. the LLM lane) can never emit a malformed verdict.
 */
export const ControlResultSchema = z.object({
  id: z.string().min(1),
  typeControle: ControlTypeSchema,
  mode: ControlModeSchema,
  statut: ControlStatusSchema,
  justification: z.string().optional(),
  suggestionIa: z.string().optional(),
});
export type ControlResult = z.infer<typeof ControlResultSchema>;

/**
 * Already-fetched audit input. The lane is pure (CLAUDE.md §3 — `lib/` never
 * touches the DB): the orchestrator loads fiche/produit/recette via
 * `src/db/queries/` and hands this shape down. Decoupled from the Drizzle row
 * shape on purpose, so the audit logic doesn't bind to the schema.
 */
export interface AuditIngredient {
  codeArticle: string;
  designation: string;
  quantiteKg: number;
  pourcentageBrut: number;
  pourcentageEtiquette: number;
  estDemeter: boolean;
  estEquitable: boolean;
  estCamellia: boolean;
  /** Marie hides this ingredient's % on the label (industrial secret). The real % stays in pourcentageEtiquette; only the QUID declaration check (3.1) treats it as a deliberate omission. */
  pourcentageMasque: boolean;
  ordreTri: number;
}

export interface AuditFicheData {
  ingredientsFr?: string | null;
  allergenes?: string | null;
  allegationsSanteFr?: string | null;
  mentionConservation?: string | null;
  mentionFabricant?: string | null;
  codeEtiquette?: string | null;
  denominationLegale?: string | null;
}

export interface AuditProduitData {
  typeTheFr?: string | null;
  denominationFr?: string | null;
  estAromatise?: boolean;
  poidsNet?: string | null;
  codeOc?: string | null;
  contientReglisse?: boolean;
  allergenesMp?: string | null;
  codeEan?: string | null;
}

export interface AuditInput {
  fiche: AuditFicheData;
  produit: AuditProduitData;
  /** Recette ingredient lines (may be empty if no recette yet). */
  ingredients: AuditIngredient[];
}

/** Verdict an individual deterministic check returns (joined into a ControlResult). */
export interface DeterministicVerdict {
  statut: ControlStatus;
  justification: string;
  suggestionIa?: string;
}
