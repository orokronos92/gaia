/**
 * The JDG columns that had no field before migration 0028, read into the new
 * product and label-sheet fields and into the production-tracking row.
 * Mapping: docs/decisions/2026-09-23-mapping-exhaustif-bdd-v2.md §2.
 */
import { indexerColonnes, texte, texteOuAbsent } from "./cellules";
import type { Cellule, Ligne } from "./cellules";

export const COLONNES_COMPLEMENTS_JDG = [
  "CODE PF", "ORIGINE EN", "ECOCERT EN", "POIDS NET OZ", "EXPORT ANGLAIS", "CODE PF EXPORT ANGLAIS", "COND.", "PRIORITÉ",
  "ANCIEN TEXTE COMMERCIAL FR 300 CARACTÈRES ESPACES COMPRIS", "RÉF FACING", "TEXTE COMMERCIAL EN COURT",
  "TEXTE ASSOCIATION LES ENGAGES", "TEXTE PRESENTATION JDG", "TEXTE TUBE", "CODE ÉTIQUETTE EXPORT",
  "CODE CONTRE-ÉTIQUETTE EXPORT",
  "PRÊT POUR AURELIEN/INTERNE", "ETIQ FINALISEE", "CONTRE FINALISEE", "IMPRIMEUR", "ENVOI A L'IMPRIMEUR",
  "PMI OK POUR PROJET PLANTES", "PMI F9 NOUVEAU TEXTE COMMERCIAL", "DATE MODIFICATION PMI F9", "SONNENTOR",
  "PREMIER LOT EN V5", "BIOCOOP", "ACTION", "COMMENTAIRES", "HISTORIQUE",
] as const;

type Colonne = (typeof COLONNES_COMPLEMENTS_JDG)[number];
export type IndexComplements = Record<Colonne, number>;

export const indexerComplementsJdg = (entetes: Ligne): IndexComplements => indexerColonnes(entetes, COLONNES_COMPLEMENTS_JDG);

/** Excel counts days from 1899-12-30; 45383 is 2024-04-01. */
const ORIGINE_DATES_EXCEL = Date.UTC(1899, 11, 30);
const MS_PAR_JOUR = 86_400_000;
const MARQUE_COCHEE = /^x$/i;

/** An Excel date cell → "YYYY-MM-DD", or null when the cell holds no date. */
export function dateExcel(cellule: Cellule): string | null {
  const valeur = texte(cellule);
  if (valeur === null || !/^\d{5}(\.\d+)?$/.test(valeur)) return null;
  return new Date(ORIGINE_DATES_EXCEL + Math.floor(Number(valeur)) * MS_PAR_JOUR).toISOString().slice(0, 10);
}

/** "x" ticked → true; empty → null (not known), never false. */
const coche = (cellule: Cellule): boolean | null => (texte(cellule) === null ? null : MARQUE_COCHEE.test(texte(cellule) ?? ""));
const reference = (cellule: Cellule): string | null => texte(cellule)?.replace(/\s+/g, "").toUpperCase() ?? null;
/** A "0" left in a text column is a spreadsheet placeholder, not a text. */
const texteReel = (cellule: Cellule): string | null => {
  const valeur = texteOuAbsent(cellule);
  return valeur === "0" ? null : valeur;
};

export interface ComplementsJdg {
  codePf: string;
  produit: {
    origineEn: string | null; mentionEcocertEn: string | null; poidsNetOz: string | null; exportAnglais: boolean;
    codePfExport: string | null; cond: string | null; priorite: string | null;
  };
  fiche: {
    ancienTexteCommercialFr: string | null; refFacingPrecedente: string | null; texteCommercialCourtEn: string | null;
    phraseEngagesEn: string | null; textePresentationEn: string | null; texteTubeEn: string | null;
    refFacingExport: string | null; refContreExport: string | null;
  };
  suivi: {
    pretPourInterne: string | null; etiquetteFinalisee: boolean | null; contreFinalisee: boolean | null;
    imprimeur: string | null; dateEnvoiImprimeur: string | null; pmiOkProjetPlantes: string | null;
    pmiF9TexteCommercial: string | null; dateModificationPmiF9: string | null; sonnentor: string | null;
    premierLotV5: string | null; biocoop: string | null; action: string | null; commentaires: string | null;
    historique: string | null;
  };
}

export function lireComplementsJdg(ligne: Ligne, index: IndexComplements): ComplementsJdg {
  const c = (colonne: Colonne) => ligne[index[colonne]];
  const t = (colonne: Colonne) => texte(c(colonne));
  return {
    codePf: t("CODE PF") ?? "",
    produit: {
      origineEn: texteOuAbsent(c("ORIGINE EN")), mentionEcocertEn: t("ECOCERT EN"), poidsNetOz: t("POIDS NET OZ"),
      exportAnglais: coche(c("EXPORT ANGLAIS")) === true, codePfExport: t("CODE PF EXPORT ANGLAIS"),
      cond: t("COND."), priorite: t("PRIORITÉ"),
    },
    fiche: {
      ancienTexteCommercialFr: texteOuAbsent(c("ANCIEN TEXTE COMMERCIAL FR 300 CARACTÈRES ESPACES COMPRIS")),
      refFacingPrecedente: reference(c("RÉF FACING")), texteCommercialCourtEn: texteOuAbsent(c("TEXTE COMMERCIAL EN COURT")),
      phraseEngagesEn: texteReel(c("TEXTE ASSOCIATION LES ENGAGES")), textePresentationEn: t("TEXTE PRESENTATION JDG"),
      texteTubeEn: t("TEXTE TUBE"), refFacingExport: reference(c("CODE ÉTIQUETTE EXPORT")),
      refContreExport: reference(c("CODE CONTRE-ÉTIQUETTE EXPORT")),
    },
    suivi: {
      pretPourInterne: t("PRÊT POUR AURELIEN/INTERNE"), etiquetteFinalisee: coche(c("ETIQ FINALISEE")),
      contreFinalisee: coche(c("CONTRE FINALISEE")), imprimeur: t("IMPRIMEUR"), dateEnvoiImprimeur: dateExcel(c("ENVOI A L'IMPRIMEUR")),
      pmiOkProjetPlantes: t("PMI OK POUR PROJET PLANTES"), pmiF9TexteCommercial: t("PMI F9 NOUVEAU TEXTE COMMERCIAL"),
      dateModificationPmiF9: dateExcel(c("DATE MODIFICATION PMI F9")), sonnentor: t("SONNENTOR"),
      premierLotV5: t("PREMIER LOT EN V5"), biocoop: t("BIOCOOP"), action: t("ACTION"),
      commentaires: t("COMMENTAIRES"), historique: t("HISTORIQUE"),
    },
  };
}
