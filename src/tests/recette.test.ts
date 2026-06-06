import { describe, it, expect } from "vitest";
import {
  computeRecette,
  evaluerDemeter,
  controleTotal,
  arrondiPlusGrandReste,
  type IngredientRecetteInput,
} from "../lib/business-rules/recette";
import { RecetteAgent } from "../agents/recette/RecetteAgent";

// Golden test — MT265 (MT165_MATE_SPORTIF.xlsx). Demeter/équitable flags are
// not part of the golden sheet, so they are left false here.
const MT265: IngredientRecetteInput[] = [
  { codeArticle: "MT100", designation: "Maté vert", quantiteKg: 10, estDemeter: false, estEquitable: false },
  { codeArticle: "EF015", designation: "Gingembre", quantiteKg: 2.5, estDemeter: false, estEquitable: false },
  { codeArticle: "EF033", designation: "Guarana", quantiteKg: 1, estDemeter: false, estEquitable: false },
  { codeArticle: "TF150", designation: "Hibiscus", quantiteKg: 1, estDemeter: false, estEquitable: false },
  { codeArticle: "AS002", designation: "HE orange sanguine", quantiteKg: 0.6, estDemeter: false, estEquitable: false },
  { codeArticle: "EF020", designation: "Menthe poivrée", quantiteKg: 0.6, estDemeter: false, estEquitable: false },
  { codeArticle: "EF055", designation: "Ginseng", quantiteKg: 0.3, estDemeter: false, estEquitable: false },
  { codeArticle: "TF175B", designation: "Stévia", quantiteKg: 0.08, estDemeter: false, estEquitable: false },
];

describe("RecetteEngine — golden MT265 (SPEC-02)", () => {
  it("reproduit le tableau étiquette à partir des seules qté", () => {
    const r = computeRecette({ ingredients: MT265, precisionArrondi: 0.5 });

    const attendu: Record<string, number> = {
      MT100: 62,
      EF015: 15.5,
      EF033: 6,
      TF150: 6,
      AS002: 4,
      EF020: 4,
      EF055: 2,
      TF175B: 0.5,
    };

    for (const ing of r.ingredients) {
      expect(ing.pourcentageEtiquette, ing.codeArticle).toBe(
        attendu[ing.codeArticle]
      );
    }

    expect(r.totalKg).toBe(16.08);
    expect(r.totalPourcentageEtiquette).toBe(100);
  });

  it("conserve l'ordre d'entrée et range ordreTri par % décroissant", () => {
    const r = computeRecette({ ingredients: MT265, precisionArrondi: 0.5 });
    // Input order preserved.
    expect(r.ingredients.map((i) => i.codeArticle)[0]).toBe("MT100");
    // Highest raw % gets rank 1, lowest gets rank n.
    const mate = r.ingredients.find((i) => i.codeArticle === "MT100");
    const stevia = r.ingredients.find((i) => i.codeArticle === "TF175B");
    expect(mate?.ordreTri).toBe(1);
    expect(stevia?.ordreTri).toBe(MT265.length);
  });
});

describe("Largest-remainder method (Hamilton)", () => {
  it("corrige le cas où l'arrondi naïf raterait 100", () => {
    // 3 × 33.333% : naive rounding to step 1 gives 33+33+33 = 99, not 100.
    const bruts = [100 / 3, 100 / 3, 100 / 3];
    const arrondis = arrondiPlusGrandReste(bruts, 1);
    expect(arrondis.reduce((s, v) => s + v, 0)).toBe(100);
    // One ingredient absorbs the missing point.
    expect([...arrondis].sort((a, b) => b - a)).toEqual([34, 33, 33]);
  });

  it("garantit Σ = 100 sur un cas qui sur-arrondirait à 100.5", () => {
    const bruts = [16.7, 16.7, 16.7, 16.7, 16.6, 16.6];
    const arrondis = arrondiPlusGrandReste(bruts, 0.5);
    expect(arrondis.reduce((s, v) => s + v, 0)).toBe(100);
  });
});

// Regression guard for PRO-QHS-013 §2.2 (see recette.ts). The official sheet is
// reproduced by distributing the leftover to the largest fractional remainders,
// NOT by dumping the whole gap on the biggest-kg ingredient. A future refactor
// that reintroduces "dump on biggest kg" must fail here, not silently ship.
describe("Arrondi QUID — report par plus grand reste, jamais sur le plus gros kg", () => {
  it("MT265 : le maté (plus gros kg) ne capte pas l'écart — il floore à 62", () => {
    const r = computeRecette({ ingredients: MT265, precisionArrondi: 0.5 });
    const mate = r.ingredients.find((i) => i.codeArticle === "MT100");
    // "dump on biggest kg" would push Maté to 63; the sheet says 62.
    expect(mate?.pourcentageEtiquette).toBe(62);
    // The leftover went to the small high-remainder ingredients instead.
    const as002 = r.ingredients.find((i) => i.codeArticle === "AS002");
    expect(as002?.pourcentageEtiquette).toBe(4); // 3,73 monté, pas 3,5
  });

  it("cas construit : le point manquant va au plus grand reste, pas au plus gros kg", () => {
    // total = 100 kg ⇒ brut% = kg. Biggest kg (A) has the smallest remainder.
    const ingredients: IngredientRecetteInput[] = [
      { codeArticle: "A", designation: "Gros", quantiteKg: 50.1, estDemeter: false, estEquitable: false },
      { codeArticle: "B", designation: "Moyen", quantiteKg: 24.8, estDemeter: false, estEquitable: false },
      { codeArticle: "C", designation: "Moyen", quantiteKg: 25.1, estDemeter: false, estEquitable: false },
    ];
    const r = computeRecette({ ingredients, precisionArrondi: 1 });
    const get = (code: string) =>
      r.ingredients.find((i) => i.codeArticle === code)?.pourcentageEtiquette;
    // Floors: 50/24/25 = 99 ; the missing point goes to B (remainder 0.8).
    expect(get("A")).toBe(50); // biggest kg — NOT bumped to 51
    expect(get("B")).toBe(25); // highest remainder — gets the point
    expect(get("C")).toBe(25);
    expect(r.totalPourcentageEtiquette).toBe(100);
  });
});

describe("Conformité Demeter", () => {
  const mix = (demeterKg: number, autreKg: number): IngredientRecetteInput[] => [
    { codeArticle: "D1", designation: "Demeter", quantiteKg: demeterKg, estDemeter: true, estEquitable: false },
    { codeArticle: "B1", designation: "Bio", quantiteKg: autreKg, estDemeter: false, estEquitable: false },
  ];

  it("calcule le % Demeter et la tranche sur un jeu mixte", () => {
    const r = evaluerDemeter(mix(8, 2)); // 80 %
    expect(r.pourcentageDemeter).toBe(80);
    expect(r.tranche).toBe("66–90 %");
    expect(r.consequenceEtiquetage).toContain("dérogation");
  });

  it("100 % Demeter → logo autorisé", () => {
    const r = evaluerDemeter(mix(10, 0));
    expect(r.pourcentageDemeter).toBe(100);
    expect(r.tranche).toBe("100 %");
  });

  it("95 % → tranche 90–100 %", () => {
    const r = evaluerDemeter(mix(9.5, 0.5));
    expect(r.tranche).toBe("90–100 %");
  });

  it("< 10 % → pas de référence Demeter", () => {
    const r = evaluerDemeter(mix(0.5, 9.5));
    expect(r.tranche).toBe("< 10 %");
  });
});

describe("Override Marie (SPEC-03)", () => {
  it("modifier une valeur ne déclenche pas de recalcul — total recontrôlé", () => {
    const r = computeRecette({ ingredients: MT265, precisionArrondi: 0.5 });
    const valeurs = r.ingredients.map((i) => i.pourcentageEtiquette);

    // Marie tape 63 au lieu de 62 sur le maté : le moteur ne recalcule rien,
    // le contrôle live signale que le total n'est plus 100.
    valeurs[0] = 63;
    const ctrl = controleTotal(valeurs);
    expect(ctrl.conforme).toBe(false);
    expect(ctrl.total).toBe(101);

    // Elle réajuste : total de nouveau conforme.
    valeurs[1] = 14.5;
    expect(controleTotal(valeurs).conforme).toBe(true);
  });
});

describe("RecetteAgent — sortie pure & validée Zod", () => {
  it("calcule sans dépendance réseau et passe la validation Zod (sans LLM)", async () => {
    const agent = new RecetteAgent(); // no LLM provider → no network call
    const out = await agent.execute({ ingredients: MT265, precisionArrondi: 0.5 });

    expect(out.totalPourcentageEtiquette).toBe(100);
    expect(out.ingredients).toHaveLength(MT265.length);
    expect(out.listeIngredientsSuggeree).toBeUndefined();
  });
});
