import { describe, expect, it } from "vitest";
import { COLONNES_JDG, indexerJdg, lireLigneJdg, separerAllegation } from "@/lib/import-catalogue/ligne-jdg";
import type { Cellule } from "@/lib/import-catalogue/cellules";
import { parseIngredientsTexte } from "@/lib/recette/parse-ingredients";
import { listeEtiquetteOuBdd } from "@/lib/recette/liste-ingredients";

const ligne = (v: Partial<Record<(typeof COLONNES_JDG)[number], Cellule>>) =>
  lireLigneJdg(COLONNES_JDG.map((c) => ({ "CODE PF": "TA6262", GAMME: "THE TRANSPORTE A LA VOILE", "DÉNOMINATION FR": "Le souffle des mers", "TYPE DE THÉ FR": "Thé vert aromatisé", ...v })[c] ?? ""), indexerJdg([...COLONNES_JDG]), 2);

describe("import JDG — fields where the fiche reads them", () => {
  it("puts the association text in the Anemos mention when COND. says Anemos", () => {
    const lu = ligne({ "COND.": "Anemos", "TEXTE ASSOCIATION LES ENGAGES 185 CARACTÈRES ESPACES COMPRIS": "Le vent comme énergie de transport…" });
    expect(lu.ok && lu.ligne.fiche).toMatchObject({ phraseAnemosFr: "Le vent comme énergie de transport…", phraseEngagesFr: null });
  });
  it("keeps it in the Engagés mention otherwise", () => {
    const lu = ligne({ "TEXTE ASSOCIATION LES ENGAGES 185 CARACTÈRES ESPACES COMPRIS": "Depuis 1999, l'association Kokopelli…" });
    expect(lu.ok && lu.ligne.fiche).toMatchObject({ phraseEngagesFr: "Depuis 1999, l'association Kokopelli…", phraseAnemosFr: null });
  });
  it("gives the list its own field and leaves the tasting field alone", () => {
    const lu = ligne({ "LISTE D'INGRÉDIENTS FR": "Ingrédient : thé blanc*. *Issu de l'agriculture biologique." });
    expect(lu.ok && lu.ligne.fiche).toMatchObject({ listeIngredientsBddFr: "Ingrédient : thé blanc*. *Issu de l'agriculture biologique.", ingredientsFr: null });
  });
  it("reads the pack and ticks volumineux only when the workbook says so", () => {
    const vol = ligne({ "CONDITIONNEMENT EXPORT": "Sachet format volumineux" });
    const gc = ligne({ "CONDITIONNEMENT EXPORT": "Sachet format GC SA9205" });
    expect(vol.ok && vol.ligne.produit).toMatchObject({ conditionnement: "Sachet format volumineux", volumineux: true });
    expect(gc.ok && gc.ligne.produit).toMatchObject({ conditionnement: "Sachet format GC SA9205", volumineux: null });
  });
});

describe("separerAllegation", () => {
  it("cuts the claim cell where the nutrition statement starts", () => {
    const cellule = "Consommation journalière conseillée : 3 tasses de 25 cl.\nIl est recommandé… Informations nutritionnelles moyennes pour 100 ml : Énergie 3 kJ/1 kcal.";
    expect(separerAllegation(cellule)).toEqual({
      allegationsSanteFr: "Consommation journalière conseillée : 3 tasses de 25 cl.\nIl est recommandé…",
      mentionNutritionnelleFr: "Informations nutritionnelles moyennes pour 100 ml : Énergie 3 kJ/1 kcal.",
    });
    expect(separerAllegation("/")).toEqual({ allegationsSanteFr: "/", mentionNutritionnelleFr: null });
  });
});

describe("parseIngredientsTexte — printed lists", () => {
  it("stops at the footnotes", () => {
    expect(parseIngredientsTexte("Ingrédients : thé noir*, arôme naturel d'amande* 7%. *Issu de l'agriculture biologique.")).toEqual([
      { designation: "thé noir", pourcentage: null },
      { designation: "arôme naturel d'amande", pourcentage: 7 },
    ]);
  });
  it("keeps a compound ingredient on one line with its own %", () => {
    const lignes = parseIngredientsTexte("Ingrédients : rooibos*, épices (cannelle*, gingembre*, poivre noir*) 15%. *Issu de l'agriculture biologique.");
    expect(lignes).toHaveLength(2);
    expect(lignes[1]).toMatchObject({ pourcentage: 15 });
    expect(lignes[1].designation).toContain("épices");
  });
});

describe("listeEtiquetteOuBdd", () => {
  it("prefers the recipe, falls back on the workbook list", () => {
    const ligneRecette = { designation: "thé noir", pourcentageEtiquette: 100, ordreTri: 0, estDemeter: false, estEquitable: false, masquerPourcentageEtiquette: true };
    expect(listeEtiquetteOuBdd([ligneRecette], "Ingrédient : thé blanc*.")).toBe("thé noir*.");
    expect(listeEtiquetteOuBdd([], " Ingrédient : thé blanc*. ")).toBe("Ingrédient : thé blanc*.");
    expect(listeEtiquetteOuBdd([], null)).toBeNull();
  });
});
