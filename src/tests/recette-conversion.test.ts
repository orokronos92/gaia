import { describe, it, expect } from "vitest";
import {
  pctVersKg,
  kgVersPct,
  normaliserVersKg,
  masseLotDe,
  masseLotEffective,
} from "../lib/recette/conversion";
import type { EtatCalculatrice, LigneIngredient } from "../lib/recette/types";
import { computeRecette } from "../lib/business-rules/recette";

// MT265 — kg is the source of truth (SPEC-03b §8.1, decision "kg = vérité").
// Same order as the engine golden in recette.test.ts.
const MASSE_LOT = 16.08;
const MT265_KG: { code: string; designation: string; kg: number }[] = [
  { code: "MT100", designation: "Maté vert", kg: 10 },
  { code: "EF015", designation: "Gingembre", kg: 2.5 },
  { code: "EF033", designation: "Guarana", kg: 1 },
  { code: "TF150", designation: "Hibiscus", kg: 1 },
  { code: "AS002", designation: "HE orange sanguine", kg: 0.6 },
  { code: "EF020", designation: "Menthe poivrée", kg: 0.6 },
  { code: "EF055", designation: "Ginseng", kg: 0.3 },
  { code: "TF175B", designation: "Stévia", kg: 0.08 },
];

const ligne = (
  o: Partial<LigneIngredient> & { designation: string }
): LigneIngredient => ({
  id: o.id ?? o.designation,
  codeArticle: o.codeArticle ?? null,
  designation: o.designation,
  quantiteKg: o.quantiteKg ?? null,
  pourcentageSaisi: o.pourcentageSaisi ?? null,
  overrideEtiquette: o.overrideEtiquette ?? null,
  estDemeter: o.estDemeter ?? false,
  estEquitable: o.estEquitable ?? false,
  masquerEtiquette: o.masquerEtiquette ?? false,
  provenance: o.provenance ?? "EXTRAIT",
  incomplet: o.incomplet ?? false,
});

describe("Conversion kg <-> % (SPEC-03b §3)", () => {
  it("pctVersKg et kgVersPct sont des inverses exacts", () => {
    expect(pctVersKg(50, 10)).toBe(5);
    expect(kgVersPct(5, 10)).toBe(50);
    // round-trip
    expect(kgVersPct(pctVersKg(37.5, 16.08), 16.08)).toBeCloseTo(37.5, 9);
  });

  it("kgVersPct rejette une masse de lot non positive", () => {
    expect(() => kgVersPct(1, 0)).toThrow(/masse de lot/i);
    expect(() => kgVersPct(1, -3)).toThrow(/masse de lot/i);
  });

  it("golden MT265 : kg -> % brut (sens sans perte)", () => {
    const attendu: Record<string, number> = {
      MT100: 62.189,
      EF015: 15.547,
      EF033: 6.219,
      TF150: 6.219,
      AS002: 3.731,
      EF020: 3.731,
      EF055: 1.866,
      TF175B: 0.498,
    };
    for (const { code, kg } of MT265_KG) {
      expect(kgVersPct(kg, MASSE_LOT), code).toBeCloseTo(attendu[code], 3);
    }
  });

  it("round-trip kg -> % -> kg exact sur tout MT265", () => {
    for (const { kg } of MT265_KG) {
      const pct = kgVersPct(kg, MASSE_LOT);
      expect(pctVersKg(pct, MASSE_LOT)).toBeCloseTo(kg, 9);
    }
  });
});

describe("masseLotDe — lot dérivé (SPEC-03b)", () => {
  it("mode kg : lot = somme des quantités", () => {
    const etat: EtatCalculatrice = {
      massePrincipaleKg: 10,
      unitMode: "kg",
      pas: 0.5,
      lignes: MT265_KG.map((i) =>
        ligne({ designation: i.designation, quantiteKg: i.kg })
      ),
    };
    expect(masseLotDe(etat)).toBeCloseTo(16.08, 6);
  });

  it("mode % : lot = masse principal × 100 / %max (maté 10 kg @ 62,189 %)", () => {
    const etat: EtatCalculatrice = {
      massePrincipaleKg: 10,
      unitMode: "pct",
      pas: 0.5,
      lignes: MT265_KG.map((i) =>
        ligne({
          designation: i.designation,
          pourcentageSaisi: kgVersPct(i.kg, MASSE_LOT),
        })
      ),
    };
    expect(masseLotDe(etat)).toBeCloseTo(16.08, 6);
  });

  it("mode % sans masse principale → null", () => {
    const etat: EtatCalculatrice = {
      massePrincipaleKg: null,
      unitMode: "pct",
      pas: 0.5,
      lignes: [ligne({ designation: "Maté", pourcentageSaisi: 62 })],
    };
    expect(masseLotDe(etat)).toBeNull();
  });
});

describe("masseLotEffective — repli base notionnelle 100", () => {
  it("masse réelle connue : lot réel, non notionnel", () => {
    const etat: EtatCalculatrice = {
      massePrincipaleKg: 10,
      unitMode: "pct",
      pas: 0.5,
      lignes: [ligne({ designation: "Maté", pourcentageSaisi: 62 })],
    };
    expect(masseLotEffective(etat)).toEqual({ lot: (10 * 100) / 62, notionnel: false });
  });

  it("mode % complet sans masse : base 100 notionnelle", () => {
    const etat: EtatCalculatrice = {
      massePrincipaleKg: null,
      unitMode: "pct",
      pas: 0.5,
      lignes: [
        ligne({ designation: "Maté", pourcentageSaisi: 62 }),
        ligne({ designation: "Gingembre", pourcentageSaisi: 38 }),
      ],
    };
    expect(masseLotEffective(etat)).toEqual({ lot: 100, notionnel: true });
  });

  it("ligne incomplète : pas de base notionnelle (null)", () => {
    const etat: EtatCalculatrice = {
      massePrincipaleKg: null,
      unitMode: "pct",
      pas: 0.5,
      lignes: [ligne({ designation: "Maté", pourcentageSaisi: null, incomplet: true })],
    };
    expect(masseLotEffective(etat)).toEqual({ lot: null, notionnel: false });
  });
});

describe("normaliserVersKg — jonction unique avec computeRecette", () => {
  const etatKg = (): EtatCalculatrice => ({
    massePrincipaleKg: 10,
    unitMode: "kg",
    pas: 0.5,
    lignes: MT265_KG.map((i) =>
      ligne({ codeArticle: i.code, designation: i.designation, quantiteKg: i.kg })
    ),
  });

  it("mode kg : reprend les quantités telles quelles", () => {
    const out = normaliserVersKg(etatKg());
    expect(out.map((o) => o.quantiteKg)).toEqual(MT265_KG.map((i) => i.kg));
    expect(out[0].codeArticle).toBe("MT100");
  });

  it("mode % : recompose les kg depuis % brut + masse principal", () => {
    const etat: EtatCalculatrice = {
      massePrincipaleKg: 10,
      unitMode: "pct",
      pas: 0.5,
      lignes: MT265_KG.map((i) =>
        ligne({
          codeArticle: i.code,
          designation: i.designation,
          pourcentageSaisi: kgVersPct(i.kg, MASSE_LOT),
        })
      ),
    };
    const out = normaliserVersKg(etat);
    out.forEach((o, idx) =>
      expect(o.quantiteKg, o.codeArticle).toBeCloseTo(MT265_KG[idx].kg, 9)
    );
  });

  it("mode % sans masse principale, lignes complètes : base notionnelle 100 (kg = %)", () => {
    const etat: EtatCalculatrice = {
      massePrincipaleKg: null,
      unitMode: "pct",
      pas: 0.5,
      lignes: [
        ligne({ designation: "Maté", pourcentageSaisi: 62 }),
        ligne({ designation: "Gingembre", pourcentageSaisi: 38 }),
      ],
    };
    expect(normaliserVersKg(etat).map((o) => o.quantiteKg)).toEqual([62, 38]);
  });

  it("mode % sans masse, ligne incomplète : refuse de convertir (pas de base notionnelle)", () => {
    const etat: EtatCalculatrice = {
      massePrincipaleKg: null,
      unitMode: "pct",
      pas: 0.5,
      lignes: [
        ligne({ designation: "Maté", pourcentageSaisi: 62 }),
        ligne({ designation: "Stévia", pourcentageSaisi: null, incomplet: true }),
      ],
    };
    // An incomplete line disables the notional base → conversion must fail, not
    // silently invent a quantity.
    expect(() => normaliserVersKg(etat)).toThrow();
  });

  it("ligne incomplète (kg manquant) : lève une erreur explicite", () => {
    const etat: EtatCalculatrice = {
      massePrincipaleKg: 10,
      unitMode: "kg",
      pas: 0.5,
      lignes: [ligne({ designation: "Menthe poivrée", incomplet: true })],
    };
    expect(() => normaliserVersKg(etat)).toThrow(/Menthe poivrée/);
  });

  it("ingrédient libre (sans code) : codeArticle coercé en chaîne vide", () => {
    const etat: EtatCalculatrice = {
      massePrincipaleKg: 10,
      unitMode: "kg",
      pas: 0.5,
      lignes: [
        ligne({
          designation: "Fleur ajoutée par Marie",
          quantiteKg: 1,
          codeArticle: null,
          provenance: "AJOUTE_MARIE",
        }),
      ],
    };
    expect(normaliserVersKg(etat)[0].codeArticle).toBe("");
  });
});

describe("Intégration conversion -> computeRecette (golden MT265)", () => {
  it("normaliserVersKg(kg) alimente l'agent et reproduit la fiche", () => {
    const etat: EtatCalculatrice = {
      massePrincipaleKg: 10,
      unitMode: "kg",
      pas: 0.5,
      lignes: MT265_KG.map((i) =>
        ligne({ codeArticle: i.code, designation: i.designation, quantiteKg: i.kg })
      ),
    };
    const r = computeRecette({
      ingredients: normaliserVersKg(etat),
      precisionArrondi: etat.pas,
    });

    const attendu: Record<string, number> = {
      MT100: 62, EF015: 15.5, EF033: 6, TF150: 6,
      AS002: 4, EF020: 4, EF055: 2, TF175B: 0.5,
    };
    for (const ing of r.ingredients) {
      expect(ing.pourcentageEtiquette, ing.codeArticle).toBe(
        attendu[ing.codeArticle]
      );
    }
    expect(r.totalPourcentageEtiquette).toBe(100);
  });
});
