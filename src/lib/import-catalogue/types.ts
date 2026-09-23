/** Shapes shared by the catalogue import (reading, merge, plan, report). */

export type Valeur = string | boolean | string[] | null;

export interface ChampsProduit {
  denominationFr: string;
  denominationEn: string | null;
  sousDesignationFr: string | null;
  sousDesignationEn: string | null;
  typeTheFr: string;
  typeTheEn: string | null;
  origine: string | null;
  producteurJardin: string | null;
  estAromatise: boolean;
  codeEan: string | null;
  poidsNet: string | null;
  tempsInfusion: string | null;
  tempInfusion: string | null;
  poidsTasse: string | null;
  nbTasses: string | null;
  plusieursInfusions: boolean;
  mentionEcocert: string | null;
  labelsClient: string[] | null;
}

export interface ChampsFiche {
  denominationLegale: string | null;
  texteCommercialFr: string | null;
  texteCommercialCourtFr: string | null;
  texteCommercialEn: string | null;
  ingredientsFr: string | null;
  ingredientsEn: string | null;
  allergenes: string | null;
  allegationsSanteFr: string | null;
  allegationsSanteEn: string | null;
  phraseWftoFr: string | null;
  statutWfto: "AUTO" | "OUI" | "NON";
  phraseEngagesFr: string | null;
  sousDesignationDe: string | null;
  ingredientsDe: string | null;
  sousDesignationIt: string | null;
  ingredientsIt: string | null;
  sousDesignationNl: string | null;
  ingredientsNl: string | null;
  refFacing: string | null;
  refContre: string | null;
  codeEtiquette: string | null;
}

/** Product fields plus the reference ids the plan resolves from the labels. */
export type ChampsProduitResolus = ChampsProduit & { gammeId: string; sousGammeId: string | null };

export interface Anomalie {
  codePf: string;
  colonne: string;
  valeur: string;
  motif: string;
}

/**
 * What the merge decided for one field of an existing product:
 * - `identique` : nothing to do;
 * - `prendre` : the workbook changed, the app did not → write the workbook value;
 * - `garder` : the app changed (Marie), the workbook did not → keep the app value;
 * - `conflit` : both changed differently → keep the app value, list it for Marie;
 * - `vide_excel` : the workbook is empty where the app has a value → keep, list.
 */
export type Decision = "identique" | "prendre" | "garder" | "conflit" | "vide_excel";

export interface DecisionChamp {
  champ: string;
  decision: Decision;
  ancetre: Valeur | undefined;
  base: Valeur;
  excel: Valeur;
}
