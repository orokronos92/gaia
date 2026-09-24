/**
 * Audit type system — shared across the three execution lanes
 * (deterministic / llm / manual). Source of truth for the audit domain:
 * PRO-QHS-313 (Procédure de vérification d'étiquetage, v.1, 30/03/2023).
 *
 * Static control metadata (libellé, référence, section, ordre) lives in the
 * registry (`control-checklist.ts`). A `ControlResult` carries only the dynamic
 * verdict and is joined back to the registry by `id` — no duplication.
 */

import { z } from "zod";

import type { StatutMention } from "./statut-mention";

/** Who evaluates a control point. The mode decides the executor — hard rule. */
/**
 * Qui répond à un point de contrôle.
 *
 * `deterministic` — du code, sur les données de la fiche.
 * `bat` — du code, mais en **lisant le BAT** : mesure, texte imprimé, tracé.
 *          Le point n'a donc de réponse que si un BAT est associé au produit.
 * `llm` — un modèle, pour ce qui demande d'interpréter un sens.
 * `manual` — un œil, parce que rien d'autre ne sait le faire aujourd'hui.
 *
 * `bat` n'est pas un détail d'affichage : ces points étaient annoncés
 * « contrôle visuel » à Marie alors que le code les mesure depuis qu'il lit les
 * BAT. Ils restent hors de la voie déterministe — celle-ci ne connaît que la
 * fiche — et c'est la fusion des constats du BAT qui les tranche.
 */
export const CONTROL_MODES = ["deterministic", "bat", "llm", "manual"] as const;
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

/**
 * Ce qu'il reste à faire sur un point — l'axe qui compte pour Marie.
 *
 * Le statut dit ce que le contrôle a trouvé ; l'action dit ce qu'elle doit
 * faire. Un même WARNING peut vouloir dire « complète la fiche » ou « regarde
 * le BAT », et ce ne sont pas les mêmes gestes. L'écran d'audit n'est pas un
 * rapport, c'est sa liste de travail.
 */
export const CONTROL_ACTIONS = ["RIEN", "COMPLETER", "VERIFIER", "CORRIGER"] as const;
export const ControlActionSchema = z.enum(CONTROL_ACTIONS);
export type ControlAction = z.infer<typeof ControlActionSchema>;

/** Sections of PRO-QHS-313, in document order. */
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
  // Hors PRO-QHS-313 : structure du code article et du GENCODE, définie par
  // MOP-PRO-029. Ce sont des contrôles sur la FICHE, pas sur l'étiquette.
  "CODE_ARTICLE",
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
  "DENOM_IDENTIQUE_BAT",
  "DENOM_NOM_USUEL",
  "INGR_MENTION",
  "INGR_ORDRE_DECROISSANT",
  "INGR_MONO",
  "INGR_ETOILES_BIO",
  "INGR_COHERENCE_RECETTE",
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
  "QTE_NETTE_TASSES",
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
  "MENTION_ANEMOS",
  "MENTION_ENGAGES",
  "POINT_VERT_ABSENT",
  "TYPO_HAUTEUR_X",
  "CODE_ETIQUETTE",
  "CODE_CONDITIONNEMENT",
  "CODE_POIDS_COHERENT",
  "GENCODE_COHERENT",
  "GENCODE_UNICITE",
] as const;
export const ControlTypeSchema = z.enum(CONTROL_TYPES);
export type ControlType = z.infer<typeof ControlTypeSchema>;

/**
 * Minimal context passed to applicability predicates. A point whose
 * `applicableSi` returns false is auto-`NA` — never audited. Mirrors the fields
 * the regulation keys applicability on (PRO-QHS-313).
 */
export interface AuditContext {
  typeTheFr?: string | null;
  contientThe?: boolean;
  /** Aucun thé nulle part — le §1.3 (noms usuels d'infusion) s'applique. */
  estInfusion?: boolean; // at least one Camellia sinensis ingredient
  estAromatise?: boolean;
  estParfumeEnfleurage?: boolean;
  ingredients?: string | null;
  allergenes?: string | null; // declared on the fiche/label
  allergeneMatiere?: boolean; // raw material flags an allergen (produits.allergenesMp)
  allegationsSanteFr?: string | null;
  contientReglisse?: boolean;
  surfaceFacePrincipaleCm2?: number | null;
  origineMpUnique?: boolean; // > 50 % from a single origin
  /**
   * Les mentions de gamme dues sur ce produit (§11.2), statut de la fiche
   * RÉSOLU — pas la gamme brute. Un `NON` de la Qualité rend le point « sans
   * objet », et l'y laisse : c'est la différence avec une dérogation, qui
   * referme la ligne et la rouvre au contrôle suivant.
   */
  mentionAnemos?: boolean; // la gamme l'exige, sauf décision contraire
  mentionEngages?: boolean; // la gamme l'exige, sauf décision contraire
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
  /** Ce qu'il reste à faire. Déduit du statut si le contrôle ne le précise pas. */
  action: ControlActionSchema.optional(),
  justification: z.string().optional(),
  suggestionIa: z.string().optional(),
});

/**
 * Un point de contrôle, plus la décision que la Qualité a portée dessus.
 *
 * La décision n'est pas dans le schéma Zod : celui-ci décrit ce que le moteur
 * produit, elle vient de la base et s'y ajoute après coup.
 */
/** Une preuve apportée par le BAT, telle qu'elle reste attachée au point. */
export interface PreuveBatResultat {
  libelle: string;
  statut: ControlStatus;
  justification: string;
  origine: string;
  manqueSurLaFiche?: string;
}

export type ControlResult = z.infer<typeof ControlResultSchema> & {
  validation?: {
    decision: import("./decisions").Decision;
    parNom: string;
    le: Date;
    justification: string | null;
    /** Vrai si le contrôle ne dit plus ce qu'elle avait validé. */
    perimee: boolean;
  };
  /** Une valeur que le BAT porte et que la fiche pourrait enregistrer. */
  proposition?: {
    table: "produit" | "fiche";
    champ: "poidsNet" | "codeEtiquette" | "phraseDemeterFr";
    valeur: string;
    source: string;
    /** Les points de la checklist que cette valeur rouvre — 1.4, 6.1, 6.2… */
    sert?: readonly string[];
  };
  /**
   * Toutes les preuves du BAT rattachées au point, dans leur ordre d'arrivée.
   *
   * Conservées sur le résultat pour que la fusion reste **rejouable** : l'écran
   * fusionne d'abord les constats mesurés, puis ceux du modèle quand Marie
   * lance l'analyse. Sans mémoire des premières, la seconde fusion réévaluait le
   * point sur les seules preuves du modèle — et un « logo détecté » effaçait une
   * Eurofeuille mesurée hors norme (constaté sur TA737 le 2026-09-10).
   */
  preuves?: PreuveBatResultat[];
  /** La liste de la fiche face à celle du BAT (point 2.5) — seulement les écarts. */
  comparaisonListe?: import("./visual/coherence-liste").ComparaisonListe;
  /** Mesuré / exigé, ou fiche / étiquette — seulement les lignes en écart. */
  faceAFace?: import("./visual/face-a-face").FaceAFace;
  /** L'état du point avant toute preuve du BAT, pour pouvoir tout réévaluer. */
  socle?: { statut: ControlStatus; action?: ControlAction; justification?: string };
  /** Où regarder sur le BAT, en fractions de la face rendue. */
  reperes?: {
    face: number;
    x: number;
    y: number;
    largeur: number;
    hauteur: number;
    libelle?: string;
  }[];
};

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
  /**
   * La recette étiquette : la liste telle qu'elle sera imprimée, dénominations
   * relues par la Qualité comprises. C'était auparavant le texte recopié de la
   * fiche dégustation — un document antérieur à la recette de production, qui ne
   * la suit pas (décision 2026-09-10).
   */
  listeEtiquette?: string | null;
  allergenes?: string | null;
  allegationsSanteFr?: string | null;
  mentionConservation?: string | null;
  mentionFabricant?: string | null;
  codeEtiquette?: string | null;
  denominationLegale?: string | null;
  /** Les mentions de gamme : ce que la Qualité a décidé, et ce qu'elle a écrit. */
  statutWfto?: StatutMention | null;
  statutDemeter?: StatutMention | null;
  statutAnemos?: StatutMention | null;
  statutEngages?: StatutMention | null;
  phraseWftoFr?: string | null;
  phraseDemeterFr?: string | null;
  phraseAnemosFr?: string | null;
  phraseEngagesFr?: string | null;
}

export interface AuditProduitData {
  /** Code article JDG (MOP-PRO-029 §2.1) — identité du produit. */
  codePf?: string | null;
  /** Gamme JDG, pour l'affichage. Ce qu'elle EXIGE se lit dans les deux drapeaux. */
  gamme?: string | null;
  /** §11.2 — la gamme impose-t-elle la mention « transporté à la voile » ? */
  exigeMentionAnemos?: boolean;
  /** §11.2 — la gamme impose-t-elle la ligne de don des Engagés ? */
  exigeMentionEngages?: boolean;
  typeTheFr?: string | null;
  denominationFr?: string | null;
  estAromatise?: boolean;
  poidsNet?: string | null;
  /** Nombre de tasses annoncé — §3.2 le calcule sur 2 g par tasse. */
  nbTasses?: string | null;
  codeOc?: string | null;
  contientReglisse?: boolean;
  allergenesMp?: string | null;
  codeEan?: string | null;
  /**
   * Autres codes produit portant le MÊME EAN. Calculé par la couche requête :
   * l'unicité d'un GTIN ne se vérifie pas sur une fiche isolée, et la voie
   * déterministe doit rester pure et sans accès base.
   */
  eanPartagePar?: string[];
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
  /**
   * À préciser quand le statut seul ne dit pas le geste attendu — typiquement
   * `COMPLETER` sur un WARNING dû à une donnée absente de la fiche, par
   * opposition à `VERIFIER` sur une donnée présente mais douteuse.
   */
  action?: ControlAction;
  justification: string;
  suggestionIa?: string;
}

/** Action par défaut quand un contrôle ne la précise pas. */
export function actionParDefaut(statut: ControlStatus): ControlAction {
  if (statut === "FAIL") return "CORRIGER";
  if (statut === "WARNING") return "VERIFIER";
  return "RIEN";
}
