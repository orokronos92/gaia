/**
 * GaïaLabel — label-control registry. Transposes PRO-QHS-013 1:1 into typed
 * control points feeding the audit (auditWorker), the `controles_conformite`
 * table, and Marie's "Audit IA" UI (grouped by `section`).
 *
 * The `mode` is the hard contract (see the `audit-checklist` skill):
 *   - `deterministic` points are NEVER judged by the LLM — pure code only
 *     (computeRecette, threshold, regex, canonical string match).
 *   - `llm` points are textual-rule interpretation, with targeted RAG.
 *   - `manual` points are visual BAT controls Marie ticks herself.
 *
 * Static metadata only. Verdicts (`ControlResult`) are computed by the lanes and
 * joined back here by `id`.
 */

import { declareAllergeneFiche } from "./canonical";
import type { AuditContext, ControlMode, ControlPoint } from "./types";

export const CONTROL_CHECKLIST: ControlPoint[] = [
  // 1. DÉNOMINATION DE LA DENRÉE
  {
    id: "1.0", ordre: 1, section: "DENOMINATION", typeControle: "DENOM_LEGALE", mode: "llm",
    libelle: "La dénomination légale décrit-elle objectivement le produit (état physique / traitement subi) ?",
    reference: "PRO-QHS-013 §1 ; INCO art. 9 et 13",
  },
  {
    id: "1.1", ordre: 2, section: "DENOMINATION", typeControle: "DENOM_THE_51", mode: "deterministic",
    libelle: "Si dénomination « thé » : le produit contient-il ≥ 51 % de Camellia sinensis ?",
    reference: "PRO-QHS-013 §1.1",
    applicableSi: (c) => c.contientThe === true,
  },
  {
    id: "1.2", ordre: 3, section: "DENOMINATION", typeControle: "DENOM_AROMATISE", mode: "llm",
    libelle: "Arôme présent : la mention « aromatisé / goût / saveur » figure-t-elle en dénomination, conforme au tableau §1.2 ?",
    reference: "PRO-QHS-013 §1.2 ; STEPI ; règl. 1334/2008",
    applicableSi: (c) => c.estAromatise === true,
  },
  {
    id: "1.3", ordre: 4, section: "DENOMINATION", typeControle: "DENOM_PARFUME", mode: "llm",
    libelle: "La mention « parfumé » est-elle utilisée UNIQUEMENT pour une aromatisation par enfleurage ?",
    reference: "PRO-QHS-013 §1.2",
    applicableSi: (c) => c.estParfumeEnfleurage === true,
  },
  {
    id: "1.4", ordre: 5, section: "DENOMINATION", typeControle: "DENOM_CHAMP_VISUEL", mode: "bat",
    libelle: "La dénomination figure-t-elle dans le même champ visuel que le poids net, en caractères droits et lisibles ?",
    reference: "PRO-QHS-013 §1 ; INCO art. 9/13",
  },
  // 2. LISTE DES INGRÉDIENTS
  {
    // Manual (BAT), not deterministic: the "Ingrédients :" prefix is UI
    // decoration on the label, not a stored field — `ingredientsFr` holds the
    // list alone, so a string match would WARNING forever. Marie ticks it on the
    // BAT until the prefix becomes real, QUID-surfaced data.
    id: "2.1", ordre: 6, section: "INGREDIENTS", typeControle: "INGR_MENTION", mode: "bat",
    libelle: "Le mot « ingrédients » précède-t-il la liste ?",
    reference: "PRO-QHS-013 §2.1",
  },
  {
    id: "2.2", ordre: 7, section: "INGREDIENTS", typeControle: "INGR_ORDRE_DECROISSANT", mode: "deterministic",
    libelle: "Les ingrédients sont-ils listés par ordre d'importance pondérale décroissante ?",
    reference: "PRO-QHS-013 §2.1",
  },
  {
    id: "2.3", ordre: 8, section: "INGREDIENTS", typeControle: "INGR_MONO", mode: "deterministic",
    libelle: "Mono-ingrédient : la liste est-elle correctement omise (dénomination = nom de l'ingrédient) ?",
    reference: "PRO-QHS-013 §2.1",
  },
  {
    id: "2.4", ordre: 9, section: "INGREDIENTS", typeControle: "INGR_ETOILES_BIO", mode: "bat",
    libelle: "Étoiles présentes (* bio / ** demeter) avec la mention de certification associée, demeter en gras italique ?",
    reference: "PRO-QHS-013 §11.1",
  },
  // 3. QUID
  {
    id: "3.1", ordre: 10, section: "QUID", typeControle: "QUID", mode: "deterministic",
    libelle: "Un % est-il déclaré pour chaque ingrédient figurant en dénomination, mis en avant graphiquement, ou source de confusion ?",
    reference: "PRO-QHS-013 §2.2",
  },
  {
    id: "3.2", ordre: 11, section: "QUID", typeControle: "ROUNDING", mode: "deterministic",
    libelle: "Règle d'arrondi respectée : un chiffre après la virgule (2e décimale 0-4 → inférieur, 5-9 → supérieur) ?",
    reference: "PRO-QHS-013 §2.2",
  },
  {
    id: "3.3", ordre: 12, section: "QUID", typeControle: "QUID_AJUSTEMENT_100", mode: "deterministic",
    libelle: "Si total > 100 % du fait des arrondis, l'ajustement porte-t-il sur l'ingrédient le plus important ?",
    reference: "PRO-QHS-013 §2.2",
  },
  // 4. DÉCLARATION NUTRITIONNELLE
  {
    id: "4.1", ordre: 13, section: "NUTRITION", typeControle: "NUTRITION_EXEMPTION", mode: "llm",
    libelle: "Le produit relève-t-il d'une catégorie exemptée (infusions, thés, mélanges sans modification de la valeur nutritionnelle) ?",
    reference: "PRO-QHS-013 §2.3 ; annexe 1",
  },
  {
    id: "4.2", ordre: 14, section: "NUTRITION", typeControle: "NUTRITION_MENTION", mode: "llm",
    libelle: "Si l'aromatisation modifie la valeur nutritionnelle (ex. caramel) : la mention « Informations nutritionnelles moyennes pour 100 ml… » figure-t-elle ?",
    reference: "PRO-QHS-013 §2.3",
  },
  // 5. PARTICULARITÉS
  {
    id: "5.1", ordre: 15, section: "PARTICULARITES", typeControle: "ALLERGEN", mode: "deterministic",
    libelle: "Allergènes présents : mis en évidence (gras / souligné) et conformes à LIS-QHS-008 ?",
    reference: "PRO-QHS-013 §3.1 ; annexe 2",
    // Applicable if the fiche declares an allergen OR the raw material flags one.
    // The latter catches the dangerous undeclared case (FAIL in checkAllergen).
    applicableSi: (c) => declareAllergeneFiche(c.allergenes) || c.allergeneMatiere === true,
  },
  {
    id: "5.2", ordre: 16, section: "PARTICULARITES", typeControle: "ALLEGATION", mode: "llm",
    libelle: "Allégation présente : valeurs nutritionnelles + mention « mode de vie sain… » + « consommation journalière conseillée : x tasses de 25 cl » (+ grammage sur logo tasse si ≠ 2 g) ?",
    reference: "PRO-QHS-013 §3.2",
    applicableSi: (c) => !!c.allegationsSanteFr && c.allegationsSanteFr.toLowerCase() !== "aucune" && c.allegationsSanteFr.trim() !== "",
  },
  {
    id: "5.3", ordre: 17, section: "PARTICULARITES", typeControle: "REGLISSE", mode: "deterministic",
    libelle: "Réglisse présente : mention JDG « Contient de la réglisse – Les personnes souffrant d'hypertension doivent éviter toute consommation excessive » ?",
    reference: "PRO-QHS-013 §3.3 ; annexe 3",
    applicableSi: (c) => c.contientReglisse === true,
  },
  // 6. QUANTITÉ NETTE
  {
    id: "6.1", ordre: 18, section: "QUANTITE_NETTE", typeControle: "QTE_NETTE_UNITE", mode: "deterministic",
    libelle: "Quantité nette exprimée en unité de masse (g ou kg) ?",
    reference: "PRO-QHS-013 §4",
  },
  {
    id: "6.2", ordre: 19, section: "QUANTITE_NETTE", typeControle: "QTE_NETTE_HAUTEUR", mode: "bat",
    libelle: "Hauteur des chiffres conforme (2 mm si ≤ 50 g ; 3 mm si 50-200 g ; 4 mm si 200-1000 g ; 6 mm si > 1000 g), dans le même champ visuel que la dénomination ?",
    reference: "PRO-QHS-013 §4",
  },
  // 7. CONSERVATION / UTILISATION
  {
    id: "7.1", ordre: 20, section: "CONSERVATION", typeControle: "CONSERVATION_MODE_EMPLOI", mode: "bat",
    libelle: "Mode d'emploi présent si nécessaire (nb sachets/cuillères, température, durée), sans recours exclusif à des symboles ?",
    reference: "PRO-QHS-013 §5",
  },
  {
    id: "7.2", ordre: 21, section: "CONSERVATION", typeControle: "CONSERVATION_MENTION", mode: "deterministic",
    libelle: "Mention JDG « À conserver à l'abri de l'humidité, de la lumière et de la chaleur » présente ?",
    reference: "PRO-QHS-013 §5",
  },
  // 8. ORIGINE GÉOGRAPHIQUE
  {
    id: "8.1", ordre: 22, section: "ORIGINE", typeControle: "ORIGINE_SOUS_CODE_OC", mode: "bat",
    libelle: "Indication de l'origine des matières premières placée sous le code de l'organisme de contrôle, sous l'Eurofeuille ?",
    reference: "PRO-QHS-013 §6 et §11.1",
  },
  {
    id: "8.2", ordre: 23, section: "ORIGINE", typeControle: "ORIGINE_AGRICULTURE_98", mode: "llm",
    libelle: "Mention « Agriculture UE / non UE / pays » cohérente avec ≥ 98 % des matières premières de cette origine ?",
    reference: "PRO-QHS-013 §6 et §11.1",
  },
  {
    id: "8.3", ordre: 24, section: "ORIGINE", typeControle: "ORIGINE_VOLONTAIRE_50", mode: "llm",
    libelle: "Mention volontaire d'origine réservée à un produit contenant > 50 % de cette origine ?",
    reference: "PRO-QHS-013 §6",
    applicableSi: (c) => c.origineMpUnique === true,
  },
  // 9. FABRICANT
  {
    id: "9.1", ordre: 25, section: "FABRICANT", typeControle: "FABRICANT_ADRESSE", mode: "deterministic",
    libelle: "Adresse JDG complète présente (LES JARDINS DE GAÏA – Z.A. – 6 rue de l'Écluse – FR-67820 Wittisheim + site web), sans code emballeur ?",
    reference: "PRO-QHS-013 §7",
  },
  // 10. GENCODE
  {
    // BAT control, not deterministic: no structured gencode in the fiche (only
    // raw codeEan). The printed barcode/gencode is read on the BAT — vision-
    // eligible (visual robot), confirmed by Marie.
    id: "10.1", ordre: 26, section: "GENCODE", typeControle: "GENCODE_STRUCTURE", mode: "manual",
    libelle: "Code-barres IMPRIMÉ sur le BAT identique au Gencode déclaré en fiche ?",
    reference: "PRO-QHS-013 §8 ; annexe 4 ; MOP-PRO-029 §3",
  },
  // 11. E MÉTROLOGIQUE
  {
    id: "11.1", ordre: 27, section: "METROLOGIE", typeControle: "METRO_E_ABSENT", mode: "bat",
    libelle: "Le « e » métrologique est-il bien ABSENT (politique JDG) ?",
    reference: "PRO-QHS-013 §9",
  },
  // 12. PICTOGRAMMES
  {
    id: "12.1", ordre: 28, section: "PICTOGRAMMES", typeControle: "TRIMAN", mode: "manual",
    libelle: "Triman présent, ≥ 1×1 cm (ou ≥ 0,6×0,6 cm si contrainte technique) ?",
    reference: "PRO-QHS-013 §10.1 ; décret 2022-975",
  },
  {
    id: "12.2", ordre: 29, section: "PICTOGRAMMES", typeControle: "INFOTRI", mode: "manual",
    libelle: "Cartouche Info-Tri complet (Triman + « le tri + facile » + éléments séparés par + + destination), règles de dématérialisation selon surface respectées ?",
    reference: "PRO-QHS-013 §10.2 ; annexe 5 ; loi AGEC art. 17",
  },
  // 13. LABELS
  {
    id: "13.1", ordre: 30, section: "LABELS", typeControle: "EUROFEUILLE", mode: "bat",
    libelle: "Eurofeuille présente, dimensions ≥ L 13,5 × H 9 mm (proportions 1/1,15), dans le même champ visuel que le code OC et l'origine ?",
    reference: "PRO-QHS-013 §11.1 ; annexe 6",
  },
  {
    // BAT control, not deterministic: FR-BIO-01 is a JDG invariant printed on
    // the label, absent from the fiche. Its presence is read on the BAT —
    // vision-eligible (visual robot), confirmed by Marie.
    id: "13.2", ordre: 31, section: "LABELS", typeControle: "CODE_OC", mode: "bat",
    libelle: "Code de l'organisme de contrôle du dernier opérateur présent (FR-BIO-01) ?",
    reference: "PRO-QHS-013 §11.1",
  },
  {
    id: "13.3", ordre: 32, section: "LABELS", typeControle: "LABELS_NON_OFFICIELS", mode: "llm",
    libelle: "Labels non officiels (WFTO, Fairtrade, Elephant Friendly, FFL, Demeter…) justifiés par la matière première et correctement apposés ?",
    reference: "PRO-QHS-013 §11.2 ; annexe 7",
  },
  {
    id: "13.4", ordre: 33, section: "LABELS", typeControle: "POINT_VERT_ABSENT", mode: "manual",
    libelle: "Logo Point Vert bien ABSENT (interdit depuis le 01/01/2021, loi AGEC) ?",
    reference: "PRO-QHS-013 §11.2 ; loi 2020-105",
  },
  // 14. TYPOGRAPHIE
  {
    id: "14.1", ordre: 34, section: "TYPOGRAPHIE", typeControle: "TYPO_HAUTEUR_X", mode: "bat",
    libelle: "Hauteur de x des mentions obligatoires conforme à la face la plus grande (0,9 mm si < 80 cm² ; ≥ 1,2 mm si > 80 cm²) ?",
    reference: "PRO-QHS-013 §12 ; INCO art. 13.2/13.3/16.2",
  },
  // 15. CODE ÉTIQUETTE
  {
    id: "15.1", ordre: 35, section: "CODE_ETIQUETTE", typeControle: "CODE_ETIQUETTE", mode: "deterministic",
    libelle: "Code étiquette présent sur la contre-étiquette ?",
    reference: "PRO-QHS-013 §13",
  },
  // ─── 16. CODE ARTICLE & GENCODE — MOP-PRO-029, hors PRO-QHS-013 ────────────
  // Ces points portent sur la FICHE, pas sur l'étiquette : ils vérifient que le
  // code produit, le poids net et le code-barres déclarés racontent la même
  // histoire. Le point 10.1, lui, compare le code-barres IMPRIMÉ à celui-ci.
  {
    id: "16.1", ordre: 36, section: "CODE_ARTICLE", typeControle: "CODE_CONDITIONNEMENT", mode: "deterministic",
    libelle: "Le code produit porte-t-il un chiffre de conditionnement (1 à 7) ?",
    reference: "MOP-PRO-029 §2.1.3",
  },
  {
    id: "16.2", ordre: 37, section: "CODE_ARTICLE", typeControle: "CODE_POIDS_COHERENT", mode: "deterministic",
    libelle: "Le chiffre de conditionnement correspond-il au poids net déclaré ?",
    reference: "MOP-PRO-029 §2.1.3",
  },
  // Le contrôle « tranche du numéro d'article ↔ type de produit » (§2.1.2) n'est
  // PAS livré : mesuré sur le catalogue, la table ne décrit que les recettes
  // maison — TA 6xx/7xx concordent, mais TV 1xx/4xx/6xx/7xx sont tous des thés
  // verts d'origine et TN 2xx à 5xx tous des thés noirs. Son périmètre exact est
  // une question pour JDG ; en attendant, le livrer produirait 119 avertissements
  // sur 172 fiches, ce qui apprend à ne plus les lire.
  {
    id: "16.3", ordre: 38, section: "CODE_ARTICLE", typeControle: "GENCODE_COHERENT", mode: "deterministic",
    libelle: "Le Gencode déclaré décode-t-il le même article et le même conditionnement, avec une clé valide ?",
    reference: "MOP-PRO-029 §3",
  },
  {
    id: "16.4", ordre: 39, section: "CODE_ARTICLE", typeControle: "GENCODE_UNICITE", mode: "deterministic",
    libelle: "Le Gencode est-il porté par ce seul produit ?",
    reference: "MOP-PRO-029 §3 ; GS1",
  },
];

/** Points applicable to a given product context; the rest are auto-`NA`. */
export function getApplicableControls(ctx: AuditContext): ControlPoint[] {
  return CONTROL_CHECKLIST.filter((c) => !c.applicableSi || c.applicableSi(ctx));
}

/** Splits points by mode to orchestrate the audit (fiche vs BAT vs LLM vs human). */
export function partitionByMode(controls: ControlPoint[]): Record<ControlMode, ControlPoint[]> {
  return {
    deterministic: controls.filter((c) => c.mode === "deterministic"),
    bat: controls.filter((c) => c.mode === "bat"),
    llm: controls.filter((c) => c.mode === "llm"),
    manual: controls.filter((c) => c.mode === "manual"),
  };
}
