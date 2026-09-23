/**
 * What `src/db/seed-real-data.ts` wrote in March 2026, recomputed from the
 * December extract with the seed's own column lookup — quirks included.
 *
 * The seed found a column by the first header *containing* a fragment, so
 * "TEXTE COMMERCIAL FR" landed on a "1-4 Nouveau texte commercial FR" split
 * column, and "PLUSIEURS INFUSIONS" was true for "/". Reproducing that exactly
 * is the point: the merge needs what the base held before Marie touched it,
 * not what the seed should have written.
 */
import { lirePhraseWfto } from "./ligne-jdg";
import type { Cellule } from "./cellules";
import type { ChampsFiche, ChampsProduit } from "./types";

export type LigneObjet = Readonly<Record<string, Cellule>>;

export interface Ancetre {
  gamme: string | null;
  sousGamme: string | null;
  produit: Partial<ChampsProduit>;
  fiche: Partial<ChampsFiche>;
}

/** The seed's `findKey`, verbatim in behaviour. */
function trouver(ligne: LigneObjet, fragment: string): Cellule {
  const cle = Object.keys(ligne).find((k) => k.toLowerCase().includes(fragment.toLowerCase()));
  return cle === undefined ? null : ligne[cle];
}

const brut = (v: Cellule): string | null => (v === null || v === undefined || v === "" ? null : String(v));

export function ancetreDepuisSeed(ligne: LigneObjet): { codePf: string; ancetre: Ancetre } | null {
  const codePf = trouver(ligne, "CODE PF");
  const denomination = trouver(ligne, "DÉNOMINATION FR");
  if (!codePf || !denomination) return null;
  const t = (fragment: string) => brut(trouver(ligne, fragment));

  const produit: Partial<ChampsProduit> = {
    denominationFr: String(denomination),
    denominationEn: t("DENOMINATION EN"),
    sousDesignationFr: t("SOUS-DÉS FR"),
    sousDesignationEn: t("SOUS-DÉS EN"),
    typeTheFr: t("TYPE DE THÉ") ?? t("TYPE DE PLANTE") ?? "Thé",
    typeTheEn: null,
    origine: t("ORIGINE"),
    producteurJardin: t("PRODUCTEUR"),
    estAromatise: Boolean(trouver(ligne, "Aromatisé")),
    codeEan: t("CODE EAN"),
    poidsNet: t("POIDS G OU KG"),
    tempsInfusion: t("TPS MIN D'INFUSION"),
    tempInfusion: t("T° C INFUSION"),
    poidsTasse: t("TASSE DE 25 CL"),
    nbTasses: t("NBRE DE TASSES"),
    plusieursInfusions: Boolean(trouver(ligne, "PLUSIEURS INFUSIONS")),
    mentionEcocert: t("CERTIF ECOCERT"),
    labelsClient: null,
    // The seed's default: "Vrac" for every product whose column was empty.
    conditionnement: t("CONDITIONNEMENT") ?? "Vrac",
  };
  const fiche: Partial<ChampsFiche> = {
    denominationLegale: String(denomination),
    texteCommercialFr: t("TEXTE COMMERCIAL FR"),
    texteCommercialCourtFr: null,
    texteCommercialEn: t("TEXTE COMMERCIAL EN"),
    ingredientsFr: t("INGRÉDIENTS FR") ?? t("INGREDIENTS FR"),
    ingredientsEn: t("INGREDIENTS EN"),
    allergenes: t("ALLERGENES"),
    allegationsSanteFr: t("ALLÉGATIONS SANTÉ FR") ?? t("ALLEGATIONS SANTE FR"),
    allegationsSanteEn: t("ALLÉGATIONS SANTÉ EN") ?? t("ALLEGATIONS SANTE EN"),
    // Migration 0018 later turned a "/" phrase into statut NON and an empty phrase.
    ...lirePhraseWfto(t("PHRASE WFTO FR")),
    phraseEngagesFr: null,
    sousDesignationDe: t("SOUS DES DE"),
    ingredientsDe: t("INGREDIENTS DE"),
    sousDesignationIt: t("SOUS DES IT"),
    ingredientsIt: t("INGREDIENTS IT"),
    sousDesignationNl: t("SOUS DES NL"),
    ingredientsNl: t("INGREDIENTS NL"),
    refFacing: null,
    refContre: null,
    codeEtiquette: t("CODE ETİQUETTE") ?? t("CODE ETIQUETTE"),
  };
  return {
    codePf: String(codePf).trim(),
    ancetre: { gamme: t("GAMME"), sousGamme: t("SOUS GAMME"), produit, fiche },
  };
}
