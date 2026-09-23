/**
 * The two sheets that complete JDG products without creating any
 * (mapping §5): "FR et EN", the translation work, which wins over the JDG
 * sheet for English (decision 4 of 2026-09-23); and "CODE ARTI EXPORT", whose
 * codes are the ones "réellement créé", which wins for export codes.
 * French columns of these sheets replace nothing: the JDG sheet is the
 * reference for French. Empty cells never erase what the JDG sheet gave.
 */
import { normaliserEntete, texte, texteOuAbsent } from "./cellules";
import type { Cellule, Ligne } from "./cellules";

export type Cible = "produit" | "fiche" | "suivi";
type Lecture = "texte" | "absent_si_slash" | "reference";

export interface ColonneComplementaire {
  entete: string;
  cible: Cible;
  champ: string;
  lecture: Lecture;
  /** Length of the destination field; a longer value is listed, not written. */
  max?: number;
  /** The JDG-sheet column carrying the same data, to list where the two differ. */
  enteteJdg?: string;
}

export interface OngletComplementaire {
  onglet: string;
  ligneEntete: number;
  colonnes: readonly ColonneComplementaire[];
}

export const FR_ET_EN: OngletComplementaire = {
  onglet: "FR et EN",
  ligneEntete: 0,
  colonnes: [
    { entete: "DÉNOMINATION EN", cible: "produit", champ: "denominationEn", max: 255, lecture: "absent_si_slash", enteteJdg: "DENOMINATION EN" },
    { entete: "DÉNOMINATION EN dans notre BDD actuelle", cible: "produit", champ: "denominationEnPrecedente", max: 255, lecture: "absent_si_slash" },
    { entete: "SOUS-DÉS EN", cible: "produit", champ: "sousDesignationEn", max: 255, lecture: "absent_si_slash", enteteJdg: "SOUS-DÉS EN" },
    { entete: "TYPE DE THÉ EN", cible: "produit", champ: "typeTheEn", max: 255, lecture: "absent_si_slash", enteteJdg: "TYPE DE THE EN" },
    { entete: "ORIGINE DU THÉ EN", cible: "produit", champ: "origineEn", max: 255, lecture: "absent_si_slash", enteteJdg: "ORIGINE EN" },
    { entete: "TEXTE TRADUIT ANGLAIS", cible: "fiche", champ: "texteCommercialEn", lecture: "absent_si_slash", enteteJdg: "NOUVEAU TEXTE COMMERCIAL EN" },
    { entete: "TEXTE ASSOCIATION LES ENGAGES 185 caractères espaces compris ANGLAIS", cible: "fiche", champ: "phraseEngagesEn", lecture: "absent_si_slash", enteteJdg: "TEXTE ASSOCIATION LES ENGAGES" },
    { entete: "LISTE D'INGRÉDIENTS EN", cible: "fiche", champ: "ingredientsEn", lecture: "absent_si_slash", enteteJdg: "LISTE INGREDIENTS EN" },
    { entete: "ALLÉGATIONS SANTÉ EN", cible: "fiche", champ: "allegationsSanteEn", lecture: "texte", enteteJdg: "ALLÉGATIONS SANTÉ EN" },
    { entete: "Gamme Export", cible: "suivi", champ: "gammeExport", max: 30, lecture: "texte" },
    { entete: "PRIORITE", cible: "suivi", champ: "prioriteExport", max: 10, lecture: "texte" },
    { entete: "Switch dans PMI", cible: "suivi", champ: "switchPmi", max: 10, lecture: "texte" },
    { entete: "Mise à jour des autres langues faite dans PMI", cible: "suivi", champ: "majLanguesPmi", max: 10, lecture: "texte" },
  ],
};

export const CODE_ARTI_EXPORT: OngletComplementaire = {
  onglet: "CODE ARTI EXPORT",
  // Row 1 is a title ("GAMME EXPORT"); the headers are on row 2.
  ligneEntete: 1,
  colonnes: [
    { entete: "PMI - Libellé 1", cible: "produit", champ: "libellePmi", max: 255, lecture: "texte" },
    { entete: "Code article produit export anglais", cible: "produit", champ: "codePfExport", max: 50, lecture: "reference", enteteJdg: "CODE PF EXPORT ANGLAIS" },
    { entete: "Conditionnement", cible: "produit", champ: "emballage", max: 120, lecture: "texte", enteteJdg: "CONDITIONNEMENT EXPORT" },
    { entete: "Code étiquette réellement créé", cible: "fiche", champ: "refFacingExport", max: 100, lecture: "reference", enteteJdg: "CODE ÉTIQUETTE EXPORT" },
    { entete: "Code contre-étiquette réellement créé", cible: "fiche", champ: "refContreExport", max: 100, lecture: "reference", enteteJdg: "CODE CONTRE-ÉTIQUETTE EXPORT" },
  ],
};

function lire(cellule: Cellule, lecture: Lecture): string | null {
  // A "0" left in a text column is a spreadsheet placeholder, not a text.
  if (lecture === "absent_si_slash") return texteOuAbsent(cellule) === "0" ? null : texteOuAbsent(cellule);
  if (lecture === "reference") return texte(cellule)?.replace(/\s+/g, "").toUpperCase() ?? null;
  return texte(cellule);
}

/** Column index of the first header matching `entete` (spacing and case ignored), or -1. */
export function position(entetes: Ligne, entete: string): number {
  const cle = normaliserEntete(entete);
  return entetes.findIndex((e) => normaliserEntete(e) === cle);
}

export interface ValeursComplementaires {
  produit: Record<string, string>;
  fiche: Record<string, string>;
  suivi: Record<string, string>;
}

export interface TropLong {
  champ: string;
  longueur: number;
  max: number;
}

export interface EcartJdg {
  champ: string;
  jdg: string;
  retenu: string;
}

/** The non-empty values a row gives, per destination, and where they contradict the JDG sheet. */
export function lireLigneComplementaire(
  ligne: Ligne,
  positions: ReadonlyMap<ColonneComplementaire, number>,
  ligneJdg: Ligne | undefined,
  positionsJdg: ReadonlyMap<string, number>,
): { valeurs: ValeursComplementaires; ecarts: EcartJdg[]; tropLongs: TropLong[] } {
  const valeurs: ValeursComplementaires = { produit: {}, fiche: {}, suivi: {} };
  const ecarts: EcartJdg[] = [];
  const tropLongs: TropLong[] = [];
  const compact = (s: string) => s.replace(/\s+/g, " ").trim();
  for (const [colonne, i] of positions) {
    const valeur = lire(ligne[i], colonne.lecture);
    if (valeur === null) continue;
    if (colonne.max !== undefined && valeur.length > colonne.max) {
      tropLongs.push({ champ: colonne.champ, longueur: valeur.length, max: colonne.max });
      continue;
    }
    valeurs[colonne.cible][colonne.champ] = valeur;
    const iJdg = colonne.enteteJdg ? positionsJdg.get(colonne.enteteJdg) : undefined;
    const jdg = ligneJdg && iJdg !== undefined ? lire(ligneJdg[iJdg], colonne.lecture) : null;
    if (jdg !== null && compact(jdg) !== compact(valeur)) ecarts.push({ champ: colonne.champ, jdg, retenu: valeur });
  }
  return { valeurs, ecarts, tropLongs };
}
