import { describe, it, expect } from "vitest";
import { genererListeIngredients, type IngredientListe } from "../lib/recette/liste-ingredients";
import { lireListeDeclaree } from "@/lib/recette/liste-declaree";

const ing = (
  designation: string,
  pourcentageEtiquette: number,
  ordreTri: number,
  estDemeter = false,
  estEquitable = false,
  estBio: boolean | undefined = undefined
): IngredientListe => ({ designation, pourcentageEtiquette, ordreTri, estDemeter, estEquitable, estBio });

describe("genererListeIngredients — liste déclarée déterministe", () => {
  it("ordonne par ordreTri, ajoute %, ponctue", () => {
    const texte = genererListeIngredients([
      ing("Gingembre", 15.5, 2),
      ing("Maté vert", 62, 1),
    ]);
    expect(texte).toBe("Maté vert* 62 %, Gingembre* 15.5 %.");
  });

  // PRO-QHS-013 §11.1 (point de contrôle 2.4) : « * bio / ** demeter ».
  it("bio par défaut → une étoile", () => {
    expect(genererListeIngredients([ing("Maté vert", 62, 1)])).toBe("Maté vert* 62 %.");
  });

  it("Demeter → deux étoiles, qui remplacent l'étoile bio", () => {
    expect(genererListeIngredients([ing("Maté vert", 62, 1, true)])).toBe("Maté vert** 62 %.");
  });

  it("non bio explicite → aucune étoile", () => {
    expect(genererListeIngredients([ing("Arôme figue", 5, 1, false, false, false)])).toBe(
      "Arôme figue 5 %."
    );
  });

  // §11.1 ne définit aucun marqueur d'équitable par ingrédient, et le BAT TA7372
  // imprime « Thé noir* » pour un ingrédient que la recette déclare équitable.
  it("équitable n'imprime rien", () => {
    expect(genererListeIngredients([ing("Thé noir", 38, 1, false, true)])).toBe("Thé noir* 38 %.");
  });

  it("applique les overrides étiquette (même ordre que les ingrédients)", () => {
    const ings = [ing("Maté", 60, 1), ing("Citron", 40, 2)];
    expect(genererListeIngredients(ings, [55, 45])).toBe("Maté* 55 %, Citron* 45 %.");
  });

  it("liste vide → chaîne vide", () => {
    expect(genererListeIngredients([])).toBe("");
  });

  it("masque le % des ingrédients choisis (nom + marqueurs gardés)", () => {
    const ings = [ing("Maté", 60, 1, true), ing("Citron", 40, 2)];
    expect(genererListeIngredients(ings, undefined, [false, true])).toBe(
      "Maté** 60 %, Citron*."
    );
  });

  it("override et masque se combinent (même ordre que les ingrédients)", () => {
    const ings = [ing("Maté", 60, 1), ing("Citron", 40, 2)];
    // Citron masqué : son override 45 n'apparaît pas ; Maté garde son override 55.
    expect(genererListeIngredients(ings, [55, 45], [false, true])).toBe(
      "Maté* 55 %, Citron*."
    );
  });

  it("masques absent → comportement inchangé (tous les %)", () => {
    const ings = [ing("Maté", 60, 1), ing("Citron", 40, 2)];
    expect(genererListeIngredients(ings)).toBe("Maté* 60 %, Citron* 40 %.");
  });
});

/**
 * Lecture de la liste DÉCLARÉE — celle recopiée de la fiche dégustation, avec
 * ses marqueurs. Ils sont le sujet ici : une étoile pour bio, deux pour Demeter,
 * et c'est leur désaccord avec la recette que le contrôle 2.5 rapporte.
 */
describe("lireListeDeclaree", () => {
  it("compte les étoiles de chaque entrée et isole la légende", () => {
    const r = lireListeDeclaree(
      "thé noir**, honeybush*, thym* 1%. *Issu de l’agriculture biologique. **… et biodynamique."
    );
    expect(r.entrees.map((e) => [e.designation, e.marqueurs])).toEqual([
      ["thé noir", 2],
      ["honeybush", 1],
      ["thym", 1],
    ]);
    // La légende porte ses propres étoiles : les compter comme un ingrédient
    // inventerait un Demeter de plus.
    expect(r.legende).toContain("biodynamique");
  });

  it("ne coupe pas une parenthèse : « arôme naturel (citron, mandarine) » est un ingrédient", () => {
    const r = lireListeDeclaree("thé vert*, arôme naturel (citron, mandarine)* 2%, gingembre* 15,5%.");
    expect(r.entrees.map((e) => e.designation)).toEqual([
      "thé vert",
      "arôme naturel (citron, mandarine)",
      "gingembre",
    ]);
    expect(r.entrees[1].pourcentage).toBe(2);
  });

  it("une virgule décimale n'est pas un séparateur", () => {
    expect(lireListeDeclaree("gingembre* 15,5%").entrees[0].pourcentage).toBe(15.5);
  });

  it("texte absent → aucune entrée, aucune conclusion", () => {
    expect(lireListeDeclaree(null).entrees).toEqual([]);
    expect(lireListeDeclaree("   ").entrees).toEqual([]);
  });
});
