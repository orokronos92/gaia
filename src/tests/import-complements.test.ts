import { describe, expect, it } from "vitest";
import { dateExcel } from "@/lib/import-catalogue/complements-jdg";
import { ecartsDecoupagePmi, ligneEnObjet } from "@/lib/import-catalogue/ligne-source";

describe("dateExcel", () => {
  it("turns an Excel day number into a date", () => {
    expect(dateExcel(45383)).toBe("2024-04-01");
    expect(dateExcel("45758")).toBe("2025-04-11");
  });
  it("ignores cells that are not dates", () => {
    expect([dateExcel(""), dateExcel("ok"), dateExcel(null)]).toEqual([null, null, null]);
  });
});

describe("ligneEnObjet", () => {
  it("keeps non-empty cells under their header, numbering repeated headers", () => {
    expect(ligneEnObjet(["CODE PF", "TEXTE\r\nA", "TEXTE A", "VIDE"], ["TB4042", "un", "deux", ""])).toEqual({
      "CODE PF": "TB4042",
      "TEXTE A": "un",
      "TEXTE A (2)": "deux",
    });
  });
});

describe("ecartsDecoupagePmi", () => {
  const complet = "LISTE D'INGRÉDIENTS FR";
  it("accepts pieces that glue back into the text, whatever the spacing at the cut", () => {
    expect(ecartsDecoupagePmi({ [complet]: "Ingrédients : thé noir", "1-4 Liste d'ingrédients": "Ingrédients :", "2-4 Liste d'ingrédients": "thé noir" })).toEqual([]);
  });
  it("reports pieces that say something else", () => {
    const ecarts = ecartsDecoupagePmi({ [complet]: "Ingrédients : thé noir", "1-4 Liste d'ingrédients": "Ingrédients : thé vert" });
    expect(ecarts).toHaveLength(1);
  });
});
