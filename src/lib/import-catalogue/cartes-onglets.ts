/**
 * Column maps of the Terra Madre and infusette sheets (mapping §3–4).
 * Infusettes have no range column: they go to an "INFUSETTES" range, the
 * sheet naming the sub-range (provisional, question in the JDG list).
 */
import type { CarteOnglet } from "./onglets-produits";

const INGREDIENTS_INFUSETTES = { listeIngredientsBddFr: "LISTE D'INGRÉDIENTS FR" } as const;

export const TERRA_MADRE: CarteOnglet = {
  onglet: "TERRA MADRE",
  catalogue: "TERRA_MADRE",
  // AR00178, and the ARD / ARR / ARS / ARDR variants.
  formatCode: /^AR[A-Z]{0,2}\d{3,5}$/,
  gamme: { colonne: "GAMME" },
  sousGamme: null,
  typeThe: "gamme",
  produit: {
    denominationFr: "DÉNOMINATION PRINCIPALE", sousDesignationFr: "1ÈRE SOUS-DÉS", denominationEn: "DÉNOMINATION SECONDAIRE",
    sousDesignationEn: "2ÈME SOUS-DÉS", origine: "ORIGINES", mentionEcocert: "ECOCERT", poidsNet: "POIDS G OU KG", codeEan: "CODE EAN",
  },
  fiche: {
    texteCommercialFr: "TEXTE ÉTIQ FR", texteCommercialEn: "TEXTE ÉTIQ EN", listeIngredientsBddFr: "LISTE D'INGRÉDIENTS FR",
    ingredientsEn: "LISTE D'INGRÉDIENTS EN", ingredientsDe: "LISTE D'INGRÉDIENTS DE", ingredientsNl: "LISTE D'INGRÉDIENTS NL",
  },
  labels: ["AB", "WFTO", "D", "IGP"],
  phraseWfto: "PHRASE WFTO FR",
  refFacing: "RÉF ÉTIQ FACING",
  refContre: "RÉF ÉTIQ CONTRE",
  extrasProduit: { emballage: ["PACK.", "texte"], poidsNetOz: ["POIDS OZ", "texte"], distinctions: ["ACTION", "texte"] },
  extrasFiche: {
    texteSiteFr: ["TEXTE SITE", "texte"], tableauNutritionnel: ["INFORMATIONS NUTRITIONNELLES", "texte"],
    phraseWftoEn: ["PHRASE WFTO EN", "absent"], bandeauFacingHaut: ["BANDEAU FACING HAUT", "texte"],
    bandeauFacingBas: ["BANDEAU FACING BAS", "texte"], paveCertification: ["PAVÉ ADRESSE (À CÔTÉ DU CODE EAN)", "texte"],
  },
  suivi: {},
};

const MENTIONS_INFUSETTES = {
  paveInfoTri: ["PAVÉ INFO TRI + TRIMAN", "oui"], labelFsc: ["LABEL FSC", "oui"],
  texteManifesteFr: ["TEXTE ARRIÈRE FR (MANIFESTE)", "texte"], siteInternet: ["SITE INTERNET", "texte"],
  mentionFabricant: ["PAVÉ ADRESSE", "texte"], mentionConditionnement: ["COND.", "texte"],
} as const;

export const INFUSETTES_PAGES: CarteOnglet = {
  onglet: "INFUSETTES PAGES",
  catalogue: "INFUSETTES_PAGES",
  formatCode: /^IF\d{3}$/,
  gamme: { fixe: "INFUSETTES" },
  sousGamme: "PAGES",
  typeThe: { colonne: "TYPE DE THÉ FR" },
  produit: {
    denominationFr: "DÉNOMINATION FR", sousDesignationFr: "SOUS-DÉS FR", denominationEn: "DÉNOMINATION EN", typeTheEn: "TYPE DE THÉ EN",
    sousDesignationEn: "SOUS-DÉS EN", poidsNet: "POIDS G OU KG", origine: "ORIGINE", mentionEcocert: "ECOCERT",
    tempsInfusion: "TPS MIN D'INFUSION", tempInfusion: "T° C INFUSION", codeEan: "CODE EAN",
  },
  fiche: {
    ...INGREDIENTS_INFUSETTES, texteCommercialFr: "NOUVEAU TEXTE COMMERCIAL FR", ingredientsEn: "LISTE D'INGRÉDIENTS EN",
    ingredientsDe: "LISTE D'INGRÉDIENTS DE", ingredientsIt: "LISTE D'INGRÉDIENTS IT",
  },
  labels: ["AB", "WFTO", "D", "WT", "IGP", "EF"],
  phraseWfto: "TEXTE FOND WFTO FR",
  extrasProduit: { quantiteParBoite: ["QTÉ/BOÎTE", "texte"] },
  extrasFiche: {
    ...MENTIONS_INFUSETTES, texteSiteFr: ["TEXTE SITE INTERNET FR", "texte"], texteTheNatureFr: ["TEXTE THÉ NATURE FR", "absent"],
    texteEcoEmballageFr: ["TEXTE FOND ÉCO-EMBALLAGE FR", "texte"], mentionOuverture: ["OUVERTURE", "texte"],
    mentionDdm: ["À CONS. DE PRÉF. AV. / N° LOT :", "texte"], ingredientsEs: ["LISTE D'INGRÉDIENTS ES", "texte"],
    ingredientsSv: ["LISTE D'INGRÉDIENTS SV", "texte"],
  },
  suivi: { imprimeur: ["IMPRIMEUR", "texte"], dateEnvoiImprimeur: ["ENVOI A L'IMPRIMEUR", "date"], note: ["NOTE", "absent"] },
};

export const INFUSETTES_COUNTRY_FARM: CarteOnglet = {
  onglet: "INFUSETTES COUNTRY FARM",
  catalogue: "INFUSETTES_COUNTRY_FARM",
  // "IFXXX" rows are placeholders and are set aside.
  formatCode: /^IF\d{3}$/,
  gamme: { fixe: "INFUSETTES" },
  sousGamme: "COUNTRY FARM",
  typeThe: { colonne: "TYPE DE THÉ FR" },
  produit: {
    denominationFr: "DÉNOMINATION FR", sousDesignationFr: "SOUS-DÉS FR", denominationEn: "DÉNOMINATION EN", typeTheEn: "TYPE DE THÉ EN",
    sousDesignationEn: "SOUS-DÉS EN", poidsNet: "POIDS NET DE LA BOITE", origine: "ORIGINE DU THE",
    mentionEcocert: "ORIGINE DES MATIERES PREMIERES", tempsInfusion: "TEMPS D'INFUSION EN MINUTES",
    tempInfusion: "TEMPERATURE D'INFUSION EN °C", codeEan: "CODE EAN",
  },
  fiche: {
    ...INGREDIENTS_INFUSETTES, texteCommercialFr: "NOUVEAU TEXTE COMMERCIAL FR", ingredientsEn: "EN INGREDIENTS",
    ingredientsDe: "DE ZUTATEN", ingredientsIt: "IT INGREDIENTI", ingredientsNl: "NL INGREDIENTEN",
  },
  labels: ["AB", "WFTO", "D", "WT", "IGP", "EF"],
  phraseWfto: "TEXTE FOND WFTO FR",
  extrasProduit: {
    quantiteParBoite: ["QUANTITE PAR BOÎTE", "texte"], poidsUnitaire: ["POIDS NET INFUSETTE EN GRAMME", "texte"],
    poidsNetOz: ["NET WEIGHT", "texte"], dureeConservation: ["DLUO", "texte"], codeMp: ["CODE MP", "texte"],
    designationMp: ["MP", "texte"], emballage: ["EMBALLAGE", "texte"],
  },
  extrasFiche: { ...MENTIONS_INFUSETTES, ingredientsEs: ["ES INGREDIENTS", "texte"], ingredientsSv: ["SV INGREDIENSER", "texte"] },
  suivi: {},
};

export const ONGLETS_PRODUITS: readonly CarteOnglet[] = [TERRA_MADRE, INFUSETTES_PAGES, INFUSETTES_COUNTRY_FARM];
