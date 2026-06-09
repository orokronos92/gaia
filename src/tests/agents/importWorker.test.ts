import { describe, it, expect } from "vitest";
import { MistralExtractionSchema } from "../../agents/imports/importWorker";

/**
 * Contract test for the import extraction safety net (CLAUDE.md §7). We do NOT
 * exercise the full processImport pipeline here: it calls the real Mistral API
 * and the DB, and mocking the worker's private extract methods (the previous
 * approach) coupled the test to internals and broke on refactor. Instead we lock
 * the Zod schema that guards every LLM output before it reaches the database —
 * the genuinely deterministic, API-free part of the worker.
 */
describe("MistralExtractionSchema — import safety net", () => {
  it("accepte une extraction JDG bien formée", () => {
    const valide = {
      codeArticle: "MT265",
      designation: "Maté Sportif",
      typePlante: "Mélange de plantes",
      aromatise: true,
      gamme: "Maté",
      ingredientsTexte: "maté vert* 62%, gingembre* 15,5%…",
      allergenes: "Aucun",
      degustateur: ["Aurélie", "Patrice"],
      parametresInfusion: { poids: "2 g", temperature: "95°C", duree: "2-3 mn" },
      labelsClient: ["AB", "WFTO"],
    };
    expect(MistralExtractionSchema.safeParse(valide).success).toBe(true);
  });

  it("accepte un objet vide (tous les champs sont optionnels)", () => {
    expect(MistralExtractionSchema.safeParse({}).success).toBe(true);
  });

  it("rejette les malformations de TYPE de l'IA", () => {
    // degustateur en string au lieu d'un tableau
    expect(
      MistralExtractionSchema.safeParse({ degustateur: "Aurélie" }).success
    ).toBe(false);
    // aromatise en string au lieu d'un booléen (checkbox mal interprétée)
    expect(
      MistralExtractionSchema.safeParse({ aromatise: "oui" }).success
    ).toBe(false);
    // parametresInfusion en string au lieu d'un objet
    expect(
      MistralExtractionSchema.safeParse({ parametresInfusion: "95°C" }).success
    ).toBe(false);
    // codeArticle numérique au lieu d'une chaîne
    expect(
      MistralExtractionSchema.safeParse({ codeArticle: 42 }).success
    ).toBe(false);
  });

  it("préserve les clés inconnues (passthrough) sans casser le flux", () => {
    const parsed = MistralExtractionSchema.parse({
      designation: "Thé Vert",
      champInattendu: "valeur libre",
    });
    expect((parsed as Record<string, unknown>).champInattendu).toBe("valeur libre");
  });
});
