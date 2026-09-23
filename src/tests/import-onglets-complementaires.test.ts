import { describe, expect, it } from "vitest";
import { FR_ET_EN, lireLigneComplementaire, position } from "@/lib/import-catalogue/onglets-complementaires";
import type { ColonneComplementaire } from "@/lib/import-catalogue/onglets-complementaires";

const colonne = (champ: string): ColonneComplementaire => {
  const c = FR_ET_EN.colonnes.find((x) => x.champ === champ);
  if (!c) throw new Error(champ);
  return c;
};

describe("lireLigneComplementaire", () => {
  const positions = new Map([[colonne("denominationEn"), 0], [colonne("sousDesignationEn"), 1], [colonne("typeTheEn"), 2]]);
  const positionsJdg = new Map([["DENOMINATION EN", 0], ["SOUS-DÉS EN", 1], ["TYPE DE THE EN", 2]]);

  it("takes the translation sheet's value and lists where the JDG sheet said otherwise", () => {
    const { valeurs, ecarts } = lireLigneComplementaire(["Like a gentle caress", "/", ""], positions, ["Starry night", "Rooibos", "Herbal"], positionsJdg);
    expect(valeurs.produit).toEqual({ denominationEn: "Like a gentle caress" });
    expect(ecarts).toEqual([{ champ: "denominationEn", jdg: "Starry night", retenu: "Like a gentle caress" }]);
  });

  it("never writes past the field's length", () => {
    const { valeurs, tropLongs } = lireLigneComplementaire(["", "x".repeat(300), ""], positions, undefined, positionsJdg);
    expect(valeurs.produit).toEqual({});
    expect(tropLongs).toEqual([{ champ: "sousDesignationEn", longueur: 300, max: 255 }]);
  });
});

describe("position", () => {
  it("finds a header whatever its spacing and case", () => {
    expect(position(["CODE PF", "Texte\r\nTraduit  anglais"], "TEXTE TRADUIT ANGLAIS")).toBe(1);
  });
});
