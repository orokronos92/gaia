import { describe, it, expect } from "vitest";
import {
  differentielComposition,
  differentielDepuisTexte,
  type LigneComposition,
} from "../lib/recette/differentiel";

const r = (designation: string, pourcentage: number | null = null): LigneComposition => ({ designation, pourcentage });

describe("differentielComposition — écarts recette ↔ produit", () => {
  it("ingrédient présent dans la recette, absent du produit → ajoute (cas MT265)", () => {
    const produit = [r("Maté vert", 62), r("Gingembre", 15.5)];
    const recette = [r("Maté vert", 62), r("Gingembre", 15.5), r("Menthe poivrée", 4), r("Stévia", 0.5)];
    const e = differentielComposition(produit, recette);
    expect(e.map((x) => [x.designation, x.type])).toEqual([
      ["Menthe poivrée", "ajoute"],
      ["Stévia", "ajoute"],
    ]);
  });

  it("ingrédient présent dans le produit, absent de la recette → retire", () => {
    const e = differentielComposition([r("Maté", 60), r("Citron", 40)], [r("Maté", 60)]);
    expect(e).toEqual([{ designation: "Citron", type: "retire", pctProduit: 40, pctRecette: null }]);
  });

  it("même ingrédient, % différent au-delà de la tolérance → pourcentage", () => {
    const e = differentielComposition([r("Maté", 60)], [r("Maté", 65)]);
    expect(e).toEqual([{ designation: "Maté", type: "pourcentage", pctProduit: 60, pctRecette: 65 }]);
  });

  it("écart de % dans la tolérance (≤ 0,5) → ignoré", () => {
    expect(differentielComposition([r("Maté", 62)], [r("Maté", 62.5)])).toEqual([]);
  });

  it("compositions alignées → aucun écart", () => {
    const liste = [r("Maté", 62), r("Gingembre", 15.5)];
    expect(differentielComposition(liste, liste)).toEqual([]);
  });

  it("insensible à la casse / aux accents sur la désignation", () => {
    expect(differentielComposition([r("Menthe Poivrée", 4)], [r("menthe poivree", 4)])).toEqual([]);
  });

  it("differentielDepuisTexte parse le texte produit", () => {
    const e = differentielDepuisTexte(
      "maté vert* 62%, gingembre* 15,5%",
      [r("Maté vert", 62), r("Gingembre", 15.5), r("Guarana", 6)]
    );
    expect(e.map((x) => x.designation)).toEqual(["Guarana"]);
    expect(e[0].type).toBe("ajoute");
  });
});
