import { describe, it, expect } from "vitest";
import { parseIngredientsTexte } from "../lib/recette/parse-ingredients";

describe("parseIngredientsTexte (SPEC-03b pré-remplissage)", () => {
  it("extraction sans % : désignations seules (dash séparateur)", () => {
    const r = parseIngredientsTexte(
      "Huile essentielle orange sanguine – gingembre - hibiscus"
    );
    expect(r.map((x) => x.designation)).toEqual([
      "Huile essentielle orange sanguine",
      "gingembre",
      "hibiscus",
    ]);
    expect(r.every((x) => x.pourcentage === null)).toBe(true);
  });

  it("liste avec % partiels : % lus, manquants laissés à null", () => {
    const r = parseIngredientsTexte(
      "Maté vert* 62 %, Gingembre 15,5 %, Menthe poivrée"
    );
    expect(r).toEqual([
      { designation: "Maté vert", pourcentage: 62 },
      { designation: "Gingembre", pourcentage: 15.5 },
      { designation: "Menthe poivrée", pourcentage: null },
    ]);
  });

  it("retire un préfixe d'étiquette de liste", () => {
    const r = parseIngredientsTexte("Liste d'ingrédient : thé vert, menthe");
    expect(r.map((x) => x.designation)).toEqual(["thé vert", "menthe"]);
  });

  it("ne casse pas un mot composé (sous-bois) sans espaces autour du tiret", () => {
    const r = parseIngredientsTexte("notes de sous-bois, cannelle");
    expect(r.map((x) => x.designation)).toEqual(["notes de sous-bois", "cannelle"]);
  });

  it("texte vide / null → tableau vide", () => {
    expect(parseIngredientsTexte("")).toEqual([]);
    expect(parseIngredientsTexte(null)).toEqual([]);
    expect(parseIngredientsTexte(undefined)).toEqual([]);
  });
});
