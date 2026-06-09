import { describe, it, expect } from "vitest";
import {
  RecetteExtractionSchema,
  recetteExtraiteVersInput,
} from "../agents/imports/recetteExtractor";
import { computeRecette } from "../lib/business-rules/recette";

describe("RecetteExtractionSchema — contrat de sortie IA", () => {
  it("accepte une extraction bien formée", () => {
    const ok = RecetteExtractionSchema.safeParse({
      ingredients: [
        { designation: "Maté vert", quantiteKg: 10, pourcentage: null, estDemeter: false, estEquitable: true },
      ],
    });
    expect(ok.success).toBe(true);
  });

  it("rejette une désignation vide ou un kg non numérique", () => {
    expect(RecetteExtractionSchema.safeParse({ ingredients: [{ designation: "" }] }).success).toBe(false);
    expect(
      RecetteExtractionSchema.safeParse({ ingredients: [{ designation: "Maté", quantiteKg: "10" }] }).success
    ).toBe(false);
  });
});

describe("recetteExtraiteVersInput — mapping pur (kg IA / repli %)", () => {
  it("tous les ingrédients ont des kg → utilise les kg", () => {
    const out = recetteExtraiteVersInput({
      ingredients: [
        { designation: "Maté vert", quantiteKg: 10, estDemeter: false, estEquitable: true },
        { designation: "Gingembre", quantiteKg: 2.5, estDemeter: false, estEquitable: false },
      ],
    });
    expect(out?.map((i) => i.quantiteKg)).toEqual([10, 2.5]);
    expect(out?.[0].estEquitable).toBe(true);
  });

  it("pas de kg mais tous des % → repli base notionnelle (kg = %)", () => {
    const out = recetteExtraiteVersInput({
      ingredients: [
        { designation: "Thé vert", pourcentage: 90 },
        { designation: "Citron", pourcentage: 10 },
      ],
    });
    expect(out?.map((i) => i.quantiteKg)).toEqual([90, 10]);
  });

  it("quantités mixtes / incomplètes → null (recette non persistée)", () => {
    expect(
      recetteExtraiteVersInput({
        ingredients: [
          { designation: "Maté", quantiteKg: 10 },
          { designation: "Stévia" }, // ni kg ni %
        ],
      })
    ).toBeNull();
    expect(recetteExtraiteVersInput({ ingredients: [] })).toBeNull();
  });

  it("intégration : kg extraits → computeRecette reproduit le QUID", () => {
    const out = recetteExtraiteVersInput({
      ingredients: [
        { designation: "Maté vert", quantiteKg: 10 },
        { designation: "Gingembre", quantiteKg: 2.5 },
        { designation: "Guarana", quantiteKg: 1 },
        { designation: "Hibiscus", quantiteKg: 1 },
        { designation: "HE orange", quantiteKg: 0.6 },
        { designation: "Menthe", quantiteKg: 0.6 },
        { designation: "Ginseng", quantiteKg: 0.3 },
        { designation: "Stévia", quantiteKg: 0.08 },
      ],
    });
    const calc = computeRecette({ ingredients: out!, precisionArrondi: 0.5 });
    expect(calc.totalPourcentageEtiquette).toBe(100);
    expect(calc.ingredients[0].pourcentageEtiquette).toBe(62);
  });
});
