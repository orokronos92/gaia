import { describe, expect, it } from "vitest";
import { CATALOGUES, LIBELLE_CATALOGUE, lireCatalogue } from "@/lib/catalogues";

describe("lireCatalogue", () => {
  it("reads a known catalogue and falls back to JDG", () => {
    expect(lireCatalogue("TERRA_MADRE")).toBe("TERRA_MADRE");
    expect([lireCatalogue(undefined), lireCatalogue("inconnu"), lireCatalogue(["JDG", "X"])]).toEqual(["JDG", "JDG", "JDG"]);
  });
  it("labels every catalogue", () => {
    expect(CATALOGUES.every((c) => LIBELLE_CATALOGUE[c].length > 0)).toBe(true);
  });
});
