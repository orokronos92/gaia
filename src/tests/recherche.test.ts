import { describe, expect, it } from "vitest";
import { LETTRES_ACCENTUEES, LETTRES_SIMPLES, motifRecherche } from "@/lib/recherche";

describe("motifRecherche", () => {
  it("folds accents, case and spacing", () => {
    expect(motifRecherche("  Ché   CHUN ")).toBe("%che chun%");
    expect(motifRecherche("Lézar’thé")).toBe("%lezar'the%");
  });
  it("escapes LIKE wildcards typed by the user", () => {
    expect(motifRecherche("50%_x")).toBe("%50\\%\\_x%");
  });
  it("keeps the SQL folding table aligned letter for letter", () => {
    expect([...LETTRES_ACCENTUEES]).toHaveLength([...LETTRES_SIMPLES].length);
  });
});
