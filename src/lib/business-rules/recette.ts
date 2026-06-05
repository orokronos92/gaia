/**
 * Recette engine — deterministic QUID computation for label ingredient lists.
 *
 * Golden reference: MT265 (MT165_MATE_SPORTIF.xlsx). Marie reconstructs by hand
 * a table of ingredient / kg / real % / rounded QUID % / Demeter / fair-trade /
 * order / total 100. This module reproduces that result from code/qty alone.
 *
 * Rule of thumb (SPEC-02 §2): every number is computed here, deterministically.
 * The LLM never touches a figure — it only formats the textual ingredient list.
 */

export type PrecisionArrondi = 0.5 | 1;

export interface IngredientRecetteInput {
  codeArticle: string;
  designation: string;
  quantiteKg: number;
  estDemeter: boolean;
  estEquitable: boolean;
}

export interface RecetteInput {
  ingredients: IngredientRecetteInput[];
  /** Rounding step — sheets mix 0.5 and 1 (MT265 has 15.5 and 0.5). */
  precisionArrondi?: PrecisionArrondi;
}

export interface IngredientCalcule {
  codeArticle: string;
  designation: string;
  quantiteKg: number;
  pourcentageBrut: number; // deterministic
  pourcentageEtiquette: number; // deterministic, Σ = 100
  estDemeter: boolean;
  estEquitable: boolean;
  ordreTri: number; // 1-based rank by descending raw %
}

export interface DemeterEvaluation {
  pourcentageDemeter: number;
  tranche: string;
  consequenceEtiquetage: string;
}

export interface RecetteCalculee {
  ingredients: IngredientCalcule[];
  totalKg: number;
  totalPourcentageEtiquette: number; // === 100
  demeter: DemeterEvaluation;
}

const POURCENTAGE_CIBLE = 100;
const PRECISION_PAR_DEFAUT: PrecisionArrondi = 0.5;
const EPSILON = 1e-9;

const arrondi2 = (v: number): number => Math.round(v * 100) / 100;
const arrondi3 = (v: number): number => Math.round(v * 1000) / 1000;
/** Floor to the nearest multiple of `pas` (epsilon guards float drift). */
const planche = (v: number, pas: number): number =>
  arrondi2(Math.floor(v / pas + EPSILON) * pas);

/**
 * Demeter France 2025 (§3.1.5 + table 6) — maps a Demeter % to its labelling
 * consequence. Ordered descending; first matching `min` wins.
 */
const TRANCHES_DEMETER: { min: number; tranche: string; consequence: string }[] = [
  { min: 100, tranche: "100 %", consequence: "Logo Demeter autorisé" },
  {
    min: 90,
    tranche: "90–100 %",
    consequence:
      "Logo autorisé ; % + statut de chaque ingrédient obligatoires",
  },
  {
    min: 66,
    tranche: "66–90 %",
    consequence:
      "Logo uniquement sur dérogation ; mention « 66–90 % » ou % réel obligatoire",
  },
  {
    min: 10,
    tranche: "10–66 %",
    consequence:
      "Logo interdit ; qualificatif « Demeter » autorisé dans la liste seulement",
  },
  { min: 0, tranche: "< 10 %", consequence: "Pas de référence Demeter" },
];

/**
 * Largest-remainder method (Hamilton). Naive per-value rounding breaks the 100 %
 * target (e.g. 99.5 / 100.5); this guarantees Σ === 100 by construction.
 *
 * @param bruts full-precision raw percentages (must already sum to ~100)
 * @param precision rounding step (0.5 or 1)
 */
export function arrondiPlusGrandReste(
  bruts: number[],
  precision: PrecisionArrondi
): number[] {
  const n = bruts.length;
  if (n === 0) return [];

  const planchers = bruts.map((b) => planche(b, precision));
  const sommePlanchers = planchers.reduce((s, v) => s + v, 0);
  const manque = POURCENTAGE_CIBLE - sommePlanchers;
  // `manque` is always a multiple of `precision` and < n × precision, so
  // `increments` is an integer in [0, n) — never overflows the ingredient count.
  const increments = Math.min(Math.max(Math.round(manque / precision), 0), n);

  // Rank by descending remainder; tie-break by descending raw % (SPEC-02 §3).
  const beneficiaires = new Set(
    bruts
      .map((b, i) => ({ i, reste: b - planchers[i], brut: b }))
      .sort((a, b) => b.reste - a.reste || b.brut - a.brut)
      .slice(0, increments)
      .map((o) => o.i)
  );

  return planchers.map((p, i) =>
    arrondi2(beneficiaires.has(i) ? p + precision : p)
  );
}

/**
 * Demeter compliance band.
 *
 * NB: the Demeter denominator excludes salt/water/minerals (Demeter FR 2025
 * §3.1.5). That exclusion is not modelled in the current input shape — the
 * recipes handled here are teas/infusions which contain none, so the
 * denominator is the total kg. Flagged as debt for a richer ingredient model.
 */
export function evaluerDemeter(
  ingredients: IngredientRecetteInput[]
): DemeterEvaluation {
  const denominateur = ingredients.reduce((s, i) => s + i.quantiteKg, 0);
  const numerateur = ingredients
    .filter((i) => i.estDemeter)
    .reduce((s, i) => s + i.quantiteKg, 0);

  const pourcentageDemeter =
    denominateur > 0 ? arrondi2((numerateur / denominateur) * 100) : 0;

  const tranche =
    TRANCHES_DEMETER.find((t) => pourcentageDemeter >= t.min) ??
    TRANCHES_DEMETER[TRANCHES_DEMETER.length - 1];

  return {
    pourcentageDemeter,
    tranche: tranche.tranche,
    consequenceEtiquetage: tranche.consequence,
  };
}

/**
 * Live total control for Marie's manual overrides (SPEC-03): when she edits a
 * `pourcentageEtiquette`, the engine does NOT recompute — this only re-checks
 * whether the running total still equals the target. The final call is hers.
 */
export function controleTotal(
  valeurs: number[],
  cible: number = POURCENTAGE_CIBLE
): { total: number; conforme: boolean } {
  const total = arrondi2(valeurs.reduce((s, v) => s + v, 0));
  return { total, conforme: Math.abs(total - cible) < 1e-6 };
}

/**
 * Full deterministic recipe computation. Pure, synchronous, network-free.
 * Throws on empty input or non-positive total (Zod-friendly hard failure).
 */
export function computeRecette(input: RecetteInput): RecetteCalculee {
  const { ingredients, precisionArrondi = PRECISION_PAR_DEFAUT } = input;

  if (ingredients.length === 0) {
    throw new Error("computeRecette: aucun ingrédient fourni");
  }

  const totalKg = arrondi3(
    ingredients.reduce((s, i) => s + i.quantiteKg, 0)
  );
  if (totalKg <= 0) {
    throw new Error("computeRecette: la quantité totale doit être > 0");
  }

  const brutsRaw = ingredients.map(
    (i) => (i.quantiteKg / totalKg) * POURCENTAGE_CIBLE
  );
  const etiquettes = arrondiPlusGrandReste(brutsRaw, precisionArrondi);

  // ordreTri: 1 = highest raw %, descending.
  const rangParIndex = new Map<number, number>();
  [...brutsRaw.keys()]
    .sort((a, b) => brutsRaw[b] - brutsRaw[a])
    .forEach((idx, rang) => rangParIndex.set(idx, rang + 1));

  const ingredientsCalcules: IngredientCalcule[] = ingredients.map(
    (ing, i) => ({
      codeArticle: ing.codeArticle,
      designation: ing.designation,
      quantiteKg: ing.quantiteKg,
      pourcentageBrut: arrondi3(brutsRaw[i]),
      pourcentageEtiquette: etiquettes[i],
      estDemeter: ing.estDemeter,
      estEquitable: ing.estEquitable,
      ordreTri: rangParIndex.get(i) as number,
    })
  );

  return {
    ingredients: ingredientsCalcules,
    totalKg,
    totalPourcentageEtiquette: arrondi2(
      etiquettes.reduce((s, v) => s + v, 0)
    ),
    demeter: evaluerDemeter(ingredients),
  };
}
