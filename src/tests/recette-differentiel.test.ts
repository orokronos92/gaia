import { describe, it, expect } from "vitest";
import {
  differentielComposition,
  differentielDepuisTexte,
  ecartsDeDenomination,
  type LigneComposition,
} from "../lib/recette/differentiel";

const r = (designation: string, pourcentage: number | null = null): LigneComposition => ({ designation, pourcentage });

describe("differentielComposition — écarts recette ↔ produit", () => {
  it("ingrédient présent dans la recette, absent du produit → ajoute (cas MT265)", () => {
    const produit = [r("Maté vert", 62), r("Gingembre", 15.5)];
    const recette = [r("Maté vert", 62), r("Gingembre", 15.5), r("Menthe poivrée", 4), r("Stévia", 0.5)];
    const e = differentielComposition(produit, recette);
    expect(e.map((x) => [x.designation, x.type])).toEqual([
      ["Menthe poivrée", "ajoute"],
      ["Stévia", "ajoute"],
    ]);
  });

  it("ingrédient présent dans le produit, absent de la recette → retire", () => {
    const e = differentielComposition([r("Maté", 60), r("Citron", 40)], [r("Maté", 60)]);
    expect(e).toEqual([{ designation: "Citron", type: "retire", pctProduit: 40, pctRecette: null }]);
  });

  it("même ingrédient, % différent au-delà de la tolérance → pourcentage", () => {
    const e = differentielComposition([r("Maté", 60)], [r("Maté", 65)]);
    expect(e).toEqual([{ designation: "Maté", type: "pourcentage", pctProduit: 60, pctRecette: 65 }]);
  });

  it("écart de % dans la tolérance (≤ 0,5) → ignoré", () => {
    expect(differentielComposition([r("Maté", 62)], [r("Maté", 62.5)])).toEqual([]);
  });

  it("compositions alignées → aucun écart", () => {
    const liste = [r("Maté", 62), r("Gingembre", 15.5)];
    expect(differentielComposition(liste, liste)).toEqual([]);
  });

  it("insensible à la casse / aux accents sur la désignation", () => {
    expect(differentielComposition([r("Menthe Poivrée", 4)], [r("menthe poivree", 4)])).toEqual([]);
  });

  it("differentielDepuisTexte parse le texte produit", () => {
    const e = differentielDepuisTexte(
      "maté vert* 62%, gingembre* 15,5%",
      [r("Maté vert", 62), r("Gingembre", 15.5), r("Guarana", 6)]
    );
    expect(e.map((x) => x.designation)).toEqual(["Guarana"]);
    expect(e[0].type).toBe("ajoute");
  });
});

describe("ecartsDeDenomination — ce qui mérite de prévenir Marie", () => {
  const recette = [
    { designation: "thé noir", pourcentage: 38.5 },
    { designation: "honeybush", pourcentage: 32 },
  ];

  it("se tait quand seuls les pourcentages bougent", () => {
    // L'arrondi change les chiffres à chaque validation : alerter là-dessus
    // ferait une alerte permanente, donc une alerte que plus personne ne lit.
    const ecarts = ecartsDeDenomination("thé noir* 38%, honeybush* 32%.", recette);
    expect(ecarts).toHaveLength(0);
  });

  it("prévient quand la recette nomme d'autres matières", () => {
    // Le cas réel : la recette porte la désignation fournisseur, l'étiquette la
    // dénomination légale. Écraser ici dégrade la liste comparée au BAT.
    const ecarts = ecartsDeDenomination("thé noir* 38%, honeybush* 32%.", [
      { designation: "SORWATHE OP1", pourcentage: 38.5 },
      { designation: "HONEYBUSH", pourcentage: 32 },
    ]);
    expect(ecarts.map((e) => e.type).sort()).toEqual(["ajoute", "retire"]);
    expect(ecarts.some((e) => e.designation === "SORWATHE OP1")).toBe(true);
  });

  it("prévient quand un ingrédient disparaît ou apparaît", () => {
    const ecarts = ecartsDeDenomination("thé noir* 38%, honeybush* 32%, thym* 1%.", recette);
    expect(ecarts).toHaveLength(1);
    expect(ecarts[0]).toMatchObject({ designation: "thym", type: "retire" });
  });

  it("se tait quand la fiche ne porte encore aucune liste", () => {
    // Rien à écraser : la recette remplit, sans rien demander.
    expect(ecartsDeDenomination(null, recette)).toHaveLength(0);
    expect(ecartsDeDenomination("", recette)).toHaveLength(0);
  });
});
