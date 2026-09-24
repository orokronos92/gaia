/**
 * One row of the JDG sheet → the product and label-sheet fields it carries.
 * Column names are exact (normalized); see
 * docs/decisions/2026-09-23-import-bdd-v2-preprod.md §5.
 */
import { z } from "zod";
import { indexerColonnes, texte, texteOuAbsent } from "./cellules";
import type { Ligne } from "./cellules";
import type { Anomalie, ChampsFiche, ChampsProduit } from "./types";

export const COLONNES_JDG = [
  "CODE PF", "GAMME", "SOUS GAMME", "DÉNOMINATION FR", "SOUS-DÉS FR", "TYPE DE THÉ FR",
  "ORIGINE DU THÉ", "AB", "WFTO", "D", "WT", "IGP", "EF", "ECOCERT", "COND.",
  "NOUVEAU TEXTE COMMERCIAL FR 300 CARACTÈRES ESPACES COMPRIS",
  "NOUVEAU TEXTE COMMERCIAL COURT POUR ETIQUETTES GRANDS CRUS",
  "TEXTE ASSOCIATION LES ENGAGES 185 CARACTÈRES ESPACES COMPRIS",
  "LISTE D'INGRÉDIENTS FR", "ALLERGENES", "ALLÉGATIONS SANTÉ FR", "PHRASE WFTO FR",
  "POIDS G OU KG", "TPS MIN D'INFUSION", "T° C INFUSION", "POIDS EN G/TASSE DE 25 CL",
  "NBRE DE TASSES", "CODE EAN", "PLUSIEURS INFUSIONS", "REF FACING 2025", "RÉF CONTRE 2025",
  "PRODUCTEUR/ JARDIN", "DENOMINATION EN", "SOUS-DÉS EN", "TYPE DE THE EN",
  "NOUVEAU TEXTE COMMERCIAL EN", "LISTE INGREDIENTS EN", "ALLÉGATIONS SANTÉ EN",
  "SOUS DES DE", "LISTE INGREDIENTS DE", "SOUS DES IT", "LISTE INGREDIENTS IT",
  "SOUS DES NL", "LISTE D'INGREDIENTS NL", "AROMATISÉ", "CONDITIONNEMENT EXPORT",
] as const;

export type ColonneJdg = (typeof COLONNES_JDG)[number];
export type IndexJdg = Record<ColonneJdg, number>;

export const indexerJdg = (entetes: Ligne): IndexJdg => indexerColonnes(entetes, COLONNES_JDG);

/** Label columns and the value each must hold to count; anything else is reported. */
const COLONNES_LABELS: ReadonlyArray<readonly [ColonneJdg, string, string]> = [
  ["AB", "AB", "AB"],
  ["WFTO", "WFTO", "WFTO"],
  ["D", "D", "Demeter"],
  ["WT", "WT", "WT"],
  ["IGP", "IGP", "IGP"],
  ["EF", "EF", "EF"],
];

/** A label reference is an ET code; "INTERNE", "tube", "Q de tube"… are not. */
export const REFERENCE_ETIQUETTE = /^ET[A-Z0-9]+$/;
/**
 * Family letters then the article number, with or without the packaging digit:
 * TA7091, TUTR2322, COF1201, and MT265 or TH200 (no packaging digit).
 */
export const FORMAT_CODE_PF = /^[A-Z]{2,4}\d{3,4}$/;
const MARQUE_EAN_INCONNU = "?";

const texteBorne = (max: number) => z.string().max(max).nullable();
export const ProduitSchema = z.object({
  denominationFr: z.string().min(1).max(255),
  denominationEn: texteBorne(255), sousDesignationFr: texteBorne(255), sousDesignationEn: texteBorne(255),
  typeTheFr: z.string().min(1).max(255), typeTheEn: texteBorne(255),
  origine: texteBorne(255), producteurJardin: texteBorne(255), estAromatise: z.boolean(),
  codeEan: texteBorne(50), poidsNet: texteBorne(50), tempsInfusion: texteBorne(50), tempInfusion: texteBorne(50),
  poidsTasse: texteBorne(50), nbTasses: texteBorne(50), plusieursInfusions: z.boolean(),
  mentionEcocert: texteBorne(255), labelsClient: z.array(z.string()).nullable(),
  conditionnement: texteBorne(100), volumineux: z.boolean().nullable(),
});
export const FicheSchema = z.object({
  denominationLegale: texteBorne(255),
  texteCommercialFr: z.string().nullable(), texteCommercialCourtFr: z.string().nullable(),
  texteCommercialEn: z.string().nullable(), ingredientsFr: z.string().nullable(), ingredientsEn: z.string().nullable(),
  allergenes: z.string().nullable(), allegationsSanteFr: z.string().nullable(), allegationsSanteEn: z.string().nullable(),
  phraseWftoFr: z.string().nullable(), statutWfto: z.enum(["AUTO", "NON"]), phraseEngagesFr: z.string().nullable(),
  phraseAnemosFr: z.string().nullable(), mentionNutritionnelleFr: z.string().nullable(), listeIngredientsBddFr: z.string().nullable(),
  sousDesignationDe: texteBorne(255), ingredientsDe: z.string().nullable(),
  sousDesignationIt: texteBorne(255), ingredientsIt: z.string().nullable(),
  sousDesignationNl: texteBorne(255), ingredientsNl: z.string().nullable(),
  refFacing: texteBorne(100), refContre: texteBorne(100), codeEtiquette: texteBorne(100),
});

export interface LigneJdgLue {
  numeroLigne: number;
  codePf: string;
  gamme: string | null;
  sousGamme: string | null;
  produit: ChampsProduit;
  fiche: ChampsFiche;
  anomalies: Anomalie[];
}

export type ResultatLigne = { ok: true; ligne: LigneJdgLue } | { ok: false; codePf: string; numeroLigne: number; motif: string };

/** Where the nutrition statement starts inside the health-claim cell (PRO-QHS-313 §2.3). */
const DEBUT_MENTION_NUTRITIONNELLE = /informations nutritionnelles/i;
/** COND. = "Anemos": the association text of the row is the sailing-transport sentence. */
const COND_ANEMOS = /anemos/i;
const VOLUMINEUX = /volumineux/i;

/**
 * The workbook's health-claim cell carries the claim, the lifestyle sentence,
 * then the nutrition statement. The statement has its own field (control 2.3):
 * the cell is cut where it starts, nothing is rewritten.
 */
export function separerAllegation(cellule: string | null): { allegationsSanteFr: string | null; mentionNutritionnelleFr: string | null } {
  if (cellule === null) return { allegationsSanteFr: null, mentionNutritionnelleFr: null };
  const debut = cellule.search(DEBUT_MENTION_NUTRITIONNELLE);
  if (debut < 0) return { allegationsSanteFr: cellule, mentionNutritionnelleFr: null };
  return { allegationsSanteFr: cellule.slice(0, debut).trim() || null, mentionNutritionnelleFr: cellule.slice(debut).trim() };
}

/** "/" in the WFTO phrase means "not due" — the same reading as migration 0018. */
export function lirePhraseWfto(cellule: string | null): { phraseWftoFr: string | null; statutWfto: "AUTO" | "NON" } {
  const phrase = texteOuAbsent(cellule);
  return phrase === null && texte(cellule) !== null
    ? { phraseWftoFr: null, statutWfto: "NON" }
    : { phraseWftoFr: phrase, statutWfto: "AUTO" };
}

export function lireLigneJdg(ligne: Ligne, index: IndexJdg, numeroLigne: number): ResultatLigne {
  const cel = (colonne: ColonneJdg) => ligne[index[colonne]];
  const t = (colonne: ColonneJdg) => texte(cel(colonne));
  const codePf = t("CODE PF") ?? "";
  const anomalies: Anomalie[] = [];
  const signaler = (colonne: string, valeur: string, motif: string) => anomalies.push({ codePf, colonne, valeur, motif });

  const labels: string[] = [];
  for (const [colonne, attendu, label] of COLONNES_LABELS) {
    const valeur = texteOuAbsent(cel(colonne));
    if (valeur === null) continue;
    if (valeur.toUpperCase() === attendu) labels.push(label);
    else signaler(colonne, valeur, "valeur qui n'est pas le label attendu, non importée");
  }

  const ean = t("CODE EAN");
  if (ean === null || ean === MARQUE_EAN_INCONNU) signaler("CODE EAN", ean ?? "(vide)", "code EAN absent");
  const cond = t("COND.");
  const anemos = cond !== null && COND_ANEMOS.test(cond);
  if (cond !== null && !anemos) signaler("COND.", cond, "valeur de COND. gardée telle quelle (sens à confirmer)");
  const texteAssociation = texteOuAbsent(cel("TEXTE ASSOCIATION LES ENGAGES 185 CARACTÈRES ESPACES COMPRIS"));
  const conditionnement = t("CONDITIONNEMENT EXPORT")?.replace(/\s+/g, " ") ?? null;

  const reference = (colonne: ColonneJdg): string | null => {
    const valeur = t(colonne)?.replace(/\s+/g, "").toUpperCase() ?? null;
    if (valeur === null || REFERENCE_ETIQUETTE.test(valeur)) return valeur;
    return null;
  };
  const refFacing = reference("REF FACING 2025");
  const refContre = reference("RÉF CONTRE 2025");
  const plusieurs = t("PLUSIEURS INFUSIONS");

  const produit = ProduitSchema.safeParse({
    denominationFr: t("DÉNOMINATION FR") ?? "", denominationEn: t("DENOMINATION EN"),
    sousDesignationFr: t("SOUS-DÉS FR"), sousDesignationEn: t("SOUS-DÉS EN"),
    typeTheFr: t("TYPE DE THÉ FR") ?? "", typeTheEn: t("TYPE DE THE EN"),
    origine: t("ORIGINE DU THÉ"), producteurJardin: texteOuAbsent(cel("PRODUCTEUR/ JARDIN")),
    estAromatise: t("AROMATISÉ") !== null,
    codeEan: ean === MARQUE_EAN_INCONNU ? null : ean, poidsNet: t("POIDS G OU KG"),
    tempsInfusion: t("TPS MIN D'INFUSION"), tempInfusion: t("T° C INFUSION"),
    poidsTasse: t("POIDS EN G/TASSE DE 25 CL"), nbTasses: t("NBRE DE TASSES"),
    plusieursInfusions: plusieurs !== null && /plusieurs infusions/i.test(plusieurs),
    mentionEcocert: t("ECOCERT"), labelsClient: labels.length > 0 ? labels : null,
    conditionnement, volumineux: conditionnement !== null && VOLUMINEUX.test(conditionnement) ? true : null,
  });
  const fiche = FicheSchema.safeParse({
    denominationLegale: t("DÉNOMINATION FR"),
    texteCommercialFr: t("NOUVEAU TEXTE COMMERCIAL FR 300 CARACTÈRES ESPACES COMPRIS"),
    texteCommercialCourtFr: texteOuAbsent(cel("NOUVEAU TEXTE COMMERCIAL COURT POUR ETIQUETTES GRANDS CRUS")),
    texteCommercialEn: t("NOUVEAU TEXTE COMMERCIAL EN"),
    // The tasting-committee field stays the extractions'; the workbook's list has its own.
    ingredientsFr: null, listeIngredientsBddFr: t("LISTE D'INGRÉDIENTS FR"), ingredientsEn: t("LISTE INGREDIENTS EN"),
    allergenes: t("ALLERGENES"), ...separerAllegation(t("ALLÉGATIONS SANTÉ FR")), allegationsSanteEn: t("ALLÉGATIONS SANTÉ EN"),
    ...lirePhraseWfto(t("PHRASE WFTO FR")),
    phraseEngagesFr: anemos ? null : texteAssociation, phraseAnemosFr: anemos ? texteAssociation : null,
    sousDesignationDe: t("SOUS DES DE"), ingredientsDe: t("LISTE INGREDIENTS DE"),
    sousDesignationIt: t("SOUS DES IT"), ingredientsIt: t("LISTE INGREDIENTS IT"),
    sousDesignationNl: t("SOUS DES NL"), ingredientsNl: t("LISTE D'INGREDIENTS NL"),
    refFacing, refContre, codeEtiquette: refContre ?? refFacing,
  });

  return valider({ numeroLigne, codePf, gamme: t("GAMME"), sousGamme: t("SOUS GAMME"), anomalies }, produit, fiche);
}

type Validation<T> = { success: true; data: T } | { success: false; error: z.ZodError };

/** Shared by every sheet that creates products: one failed field sets the row aside. */
export function valider(
  entete: Omit<LigneJdgLue, "produit" | "fiche">,
  produit: Validation<ChampsProduit>,
  fiche: Validation<ChampsFiche>,
): ResultatLigne {
  if (!produit.success || !fiche.success) {
    const erreur = (produit.success ? (fiche as { error: z.ZodError }).error : produit.error).issues[0];
    return { ok: false, codePf: entete.codePf, numeroLigne: entete.numeroLigne, motif: `champ invalide : ${erreur?.path.join(".")} (${erreur?.message})` };
  }
  return { ok: true, ligne: { ...entete, produit: produit.data, fiche: fiche.data } };
}
