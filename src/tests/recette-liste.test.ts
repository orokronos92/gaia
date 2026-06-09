import { describe, it, expect } from "vitest";
import { genererListeIngredients, type IngredientListe } from "../lib/recette/liste-ingredients";

const ing = (
  designation: string,
  pourcentageEtiquette: number,
  ordreTri: number,
  estDemeter = false,
  estEquitable = false
): IngredientListe => ({ designation, pourcentageEtiquette, ordreTri, estDemeter, estEquitable });

describe("genererListeIngredients — liste déclarée déterministe", () => {
  it("ordonne par ordreTri, ajoute %, ponctue", () => {
    const texte = genererListeIngredients([
      ing("Gingembre", 15.5, 2),
      ing("Maté vert", 62, 1),
    ]);
    expect(texte).toBe("Maté vert 62 %, Gingembre 15.5 %.");
  });

  it("marqueurs Demeter (✱) et équitable (°)", () => {
    expect(genererListeIngredients([ing("Maté vert", 62, 1, true, true)])).toBe("Maté vert✱° 62 %.");
  });

  it("applique les overrides étiquette (même ordre que les ingrédients)", () => {
    const ings = [ing("Maté", 60, 1), ing("Citron", 40, 2)];
    expect(genererListeIngredients(ings, [55, 45])).toBe("Maté 55 %, Citron 45 %.");
  });

  it("liste vide → chaîne vide", () => {
    expect(genererListeIngredients([])).toBe("");
  });
});
