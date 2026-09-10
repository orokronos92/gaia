/**
 * Locating and reading one recette table inside a sheet.
 *
 * A table is anchored on its printed header row — CODE ARTICLE / DESIGNATION —
 * and every other column is found by its own printed label, so a form that gains
 * or loses a column keeps working. Rows are then read by cell address: the
 * DEMETER and COMMERCE ÉQUITABLE ticks come from their own cells and can no
 * longer slide into each other.
 */

import * as xlsx from "xlsx";
import { lireCase, nombreCellule, normaliser, texteCellule } from "./xlsx-cellules";

/** Printed header labels, normalised, in the order JDG lays them out. */
const LIBELLES_COLONNES = {
  codeArticle: ["CODE ARTICLE"],
  designation: ["DESIGNATION"],
  demeter: ["DEMETER"],
  equitable: ["COMMERCE EQUITABLE", "EQUITABLE"],
  kg: ["QTE EN KG", "QUANTITE EN KG OU EN LITRE", "QUANTITE EN KG"],
  pourcentage: ["QTE EN %", "QUANTITE EN %"],
  pourcentageEtiquette: ["% POUR LISTE D'INGREDIENT"],
} as const;

export type NomColonne = keyof typeof LIBELLES_COLONNES;

/** Rows scanned past a header before giving up on finding the table's end. */
const PORTEE_TABLEAU = 80;

export interface LigneRecetteLue {
  codeArticle: string | null;
  designation: string;
  estDemeter: boolean;
  estEquitable: boolean;
  quantiteKg: number | null;
  pourcentageSource: number | null;
  /** JDG's own label percentage — the "% pour liste d'ingrédient" column. */
  pourcentageEtiquetteSource: number | null;
  /** 1-based sheet row, so a finding can be pointed at its cell. */
  ligne: number;
}

export interface TableauRecetteLu {
  onglet: string;
  /** "VERSION NOUVELLE RECETTE : V.2" when the form carries one. */
  intitule: string | null;
  estNouvelleVersion: boolean;
  /** 1-based header row. */
  ligneEntete: number;
  /** Column letter behind each recognised field, for traceability. */
  colonnes: Partial<Record<NomColonne, string>>;
  lignes: LigneRecetteLue[];
  totalKgSource: number | null;
}



function estLibelle(valeur: string, alias: readonly string[]): boolean {
  const cle = normaliser(valeur);
  return alias.some((a) => cle === a);
}

/** A header row carries CODE ARTICLE and DESIGNATION in two distinct columns. */
export function colonnesDEntete(
  feuille: xlsx.WorkSheet,
  ligne: number,
  premiere: number,
  derniere: number
): Partial<Record<NomColonne, number>> | null {
  const trouvees: Partial<Record<NomColonne, number>> = {};
  for (let c = premiere; c <= derniere; c++) {
    const texte = texteCellule(feuille, c, ligne);
    if (texte === "") continue;
    for (const [nom, alias] of Object.entries(LIBELLES_COLONNES) as [
      NomColonne,
      readonly string[],
    ][]) {
      if (trouvees[nom] === undefined && estLibelle(texte, alias)) trouvees[nom] = c;
    }
  }
  return trouvees.codeArticle !== undefined && trouvees.designation !== undefined
    ? trouvees
    : null;
}

export function contientTotal(
  feuille: xlsx.WorkSheet,
  ligne: number,
  premiere: number,
  derniere: number
): boolean {
  for (let c = premiere; c <= derniere; c++) {
    if (normaliser(texteCellule(feuille, c, ligne)) === "TOTAL") return true;
  }
  return false;
}

/** "VERSION NOUVELLE RECETTE : V.2" → 2 ; a "bis" ranks just above its base. */
export function numeroVersion(texte: string | null): number | null {
  if (!texte) return null;
  const trouve = /V\.?\s*(\d+)/i.exec(texte);
  if (!trouve) return null;
  return Number(trouve[1]) + (/\bBIS\b/i.test(texte) ? 0.5 : 0);
}

export function lireTableau(
  feuille: xlsx.WorkSheet,
  onglet: string,
  ligneEntete: number,
  colonnes: Partial<Record<NomColonne, number>>,
  bornes: xlsx.Range,
  anomalies: string[]
): TableauRecetteLu {
  const lignes: LigneRecetteLue[] = [];
  let totalKgSource: number | null = null;

  const colonneDe = (nom: NomColonne): number | undefined => colonnes[nom];
  const fin = Math.min(bornes.e.r, ligneEntete + PORTEE_TABLEAU);

  for (let r = ligneEntete + 1; r <= fin; r++) {
    if (contientTotal(feuille, r, bornes.s.c, bornes.e.c)) {
      const cKg = colonneDe("kg");
      totalKgSource = cKg === undefined ? null : nombreCellule(feuille, cKg, r);
      break;
    }
    if (colonnesDEntete(feuille, r, bornes.s.c, bornes.e.c)) break;

    const cDesignation = colonneDe("designation");
    const designation = cDesignation === undefined ? "" : texteCellule(feuille, cDesignation, r);
    if (designation === "") continue;

    const cDemeter = colonneDe("demeter");
    const cEquitable = colonneDe("equitable");
    const demeter = cDemeter === undefined ? null : lireCase(feuille, cDemeter, r);
    const equitable = cEquitable === undefined ? null : lireCase(feuille, cEquitable, r);
    for (const [nom, lu] of [["DEMETER", demeter], ["COMMERCE ÉQUITABLE", equitable]] as const) {
      if (lu?.valeurInattendue) {
        anomalies.push(
          `${onglet} ligne ${r + 1} : la colonne ${nom} contient « ${lu.valeurInattendue} », lu comme une coche.`
        );
      }
    }

    const cCode = colonneDe("codeArticle");
    const cKg = colonneDe("kg");
    const cPct = colonneDe("pourcentage");
    const cPctEtiquette = colonneDe("pourcentageEtiquette");
    lignes.push({
      codeArticle: (cCode === undefined ? "" : texteCellule(feuille, cCode, r)) || null,
      designation,
      estDemeter: demeter?.cochee ?? false,
      estEquitable: equitable?.cochee ?? false,
      quantiteKg: cKg === undefined ? null : nombreCellule(feuille, cKg, r),
      pourcentageSource: cPct === undefined ? null : nombreCellule(feuille, cPct, r),
      pourcentageEtiquetteSource:
        cPctEtiquette === undefined ? null : nombreCellule(feuille, cPctEtiquette, r),
      ligne: r + 1,
    });
  }

  const intitule = intituleAuDessus(feuille, ligneEntete);
  const lettres: Partial<Record<NomColonne, string>> = {};
  for (const [nom, index] of Object.entries(colonnes) as [NomColonne, number][]) {
    lettres[nom] = xlsx.utils.encode_col(index);
  }

  return {
    onglet,
    intitule,
    estNouvelleVersion: /NOUVELLE RECETTE/i.test(intitule ?? ""),
    ligneEntete: ligneEntete + 1,
    colonnes: lettres,
    lignes,
    totalKgSource,
  };
}

/**
 * "VERSION NOUVELLE RECETTE : V.2" sits in column A just above its header.
 * Only a table intitulé counts — the sheet's own "VERSION | V.0" identity row
 * starts with the same word and must not be mistaken for one.
 */
function intituleAuDessus(feuille: xlsx.WorkSheet, ligneEntete: number): string | null {
  for (let r = ligneEntete - 1; r >= Math.max(0, ligneEntete - 2); r--) {
    const texte = texteCellule(feuille, 0, r);
    if (/^VERSION\s+(RECETTE|NOUVELLE)/i.test(texte)) return texte;
  }
  return null;
}
