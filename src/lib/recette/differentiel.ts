/**
 * Composition differential (Lot 4) — what Marie must ALWAYS see: where the
 * recette diverges from the produit (dégustation) ingredient list. Composition
 * only (decision 2026-06-09-reconciliation-sources): presence and %.
 *
 * Pure/testable. The recette is the truth; this only surfaces the gap so Marie
 * can validate it knowingly.
 */

import { parseIngredientsTexte } from "./parse-ingredients";

export interface LigneComposition {
  designation: string;
  pourcentage: number | null;
}

export type TypeEcart = "ajoute" | "retire" | "pourcentage";

export interface EcartComposition {
  designation: string;
  type: TypeEcart;
  /** % on the produit/dégustation side. */
  pctProduit: number | null;
  /** % on the recette side. */
  pctRecette: number | null;
}

/** Differences within the rounding step are ignored. */
const TOLERANCE_PCT = 0.5;

function normaliser(designation: string): string {
  return designation
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Differential by normalized designation:
 *  - in recette, not in produit  → "ajoute"  (e.g. an R&D-only ingredient)
 *  - in produit, not in recette  → "retire"
 *  - in both, % differ > tolerance → "pourcentage"
 */
export function differentielComposition(
  produit: LigneComposition[],
  recette: LigneComposition[]
): EcartComposition[] {
  const pMap = new Map(produit.map((i) => [normaliser(i.designation), i]));
  const rMap = new Map(recette.map((i) => [normaliser(i.designation), i]));
  const ecarts: EcartComposition[] = [];

  for (const [key, r] of rMap) {
    const p = pMap.get(key);
    if (!p) {
      ecarts.push({ designation: r.designation, type: "ajoute", pctProduit: null, pctRecette: r.pourcentage });
    } else if (
      p.pourcentage != null &&
      r.pourcentage != null &&
      Math.abs(p.pourcentage - r.pourcentage) > TOLERANCE_PCT
    ) {
      ecarts.push({ designation: r.designation, type: "pourcentage", pctProduit: p.pourcentage, pctRecette: r.pourcentage });
    }
  }
  for (const [key, p] of pMap) {
    if (!rMap.has(key)) {
      ecarts.push({ designation: p.designation, type: "retire", pctProduit: p.pourcentage, pctRecette: null });
    }
  }
  return ecarts;
}

/** Differential straight from the produit ingredient text + the recette lines. */
export function differentielDepuisTexte(
  texteProduit: string | null | undefined,
  recette: LigneComposition[]
): EcartComposition[] {
  return differentielComposition(parseIngredientsTexte(texteProduit), recette);
}

/**
 * Les écarts qui portent sur les MATIÈRES, jamais sur l'arrondi.
 *
 * Réécrire la liste déclarée depuis la recette est le comportement normal — la
 * recette est la référence. Mais la recette porte des désignations fournisseur
 * (« SORWATHE OP1 ») là où l'étiquette imprime une dénomination légale (« thé
 * noir ») : dans ce cas la réécriture dégrade la donnée même que l'audit oppose
 * au BAT, et il faut le montrer avant d'écrire.
 *
 * Un écart de pourcentage ne passe jamais par ici : c'est l'arrondi, il est
 * attendu, et une alerte qui se déclenche à chaque validation cesse d'être lue.
 */
export function ecartsDeDenomination(
  declaree: string | null | undefined,
  recette: LigneComposition[]
): EcartComposition[] {
  // Une fiche sans liste déclarée n'a rien à protéger : la recette la remplit,
  // et demander l'autorisation d'écrire dans le vide n'apprendrait rien.
  if (!declaree?.trim()) return [];
  return differentielDepuisTexte(declaree, recette).filter((e) => e.type !== "pourcentage");
}
