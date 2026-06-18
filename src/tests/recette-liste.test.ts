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

  it("masque le % des ingrédients choisis (nom + marqueurs gardés)", () => {
    const ings = [ing("Maté", 60, 1, true), ing("Citron", 40, 2)];
    expect(genererListeIngredients(ings, undefined, [false, true])).toBe(
      "Maté✱ 60 %, Citron."
    );
  });

  it("override et masque se combinent (même ordre que les ingrédients)", () => {
    const ings = [ing("Maté", 60, 1), ing("Citron", 40, 2)];
    // Citron masqué : son override 45 n'apparaît pas ; Maté garde son override 55.
    expect(genererListeIngredients(ings, [55, 45], [false, true])).toBe(
      "Maté 55 %, Citron."
    );
  });

  it("masques absent → comportement inchangé (tous les %)", () => {
    const ings = [ing("Maté", 60, 1), ing("Citron", 40, 2)];
    expect(genererListeIngredients(ings)).toBe("Maté 60 %, Citron 40 %.");
  });
});
