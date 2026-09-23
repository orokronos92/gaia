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
  /**
   * Not carried by the workbook (its pack lives in `emballage`): always null
   * from it, so the merge erases the "Vrac" the March seed invented.
   */
  conditionnement: string | null;
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
 * What the merge decided for one field of an existing product (the workbook is
 * the reference):
 * - `identique` : nothing to do;
 * - `prendre` : the base held nothing, or only what the March seed wrote → write the workbook value (null included);
 * - `ecraser` : the base held a value typed in the app → the workbook value replaces it, the old one is logged;
 * - `vide_excel` : the workbook is empty where the app has its own value → keep, list;
 * - `conflit` : a value the catalogue cannot take (a label code already held elsewhere) → keep, list.
 */
export type Decision = "identique" | "prendre" | "ecraser" | "vide_excel" | "conflit";

export interface DecisionChamp {
  champ: string;
  decision: Decision;
  ancetre: Valeur | undefined;
  base: Valeur;
  excel: Valeur;
}
