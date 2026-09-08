import { describe, it, expect } from "vitest";

import {
  controlerTypographie,
  poidsNetEnGrammes,
  seuilHauteurChiffresMm,
  trancheSurface,
} from "../lib/audit/visual/typographie";
import type { AnalyseBat, MotBat } from "../lib/utils/pdf-bat";

/** Une police fictive dont les métriques donnent des millimètres ronds. */
const POLICE = { nom: "Test", xHeight: 500, capHeight: 700, fontWeight: 400, italicAngle: 0, flags: 32 };

const mot = (texte: string, corpsPt: number | null, x = 0, y = 0): MotBat => ({
  texte,
  x,
  y,
  largeur: 10,
  hauteur: 5,
  corpsPt,
  police: corpsPt === null ? null : "Test",
});

const face = (surfaceCm2: number | null, mots: MotBat[]): AnalyseBat => ({
  pages: [
    {
      largeurPt: 200,
      hauteurPt: 400,
      coupe: surfaceCm2 === null ? null : { largeurMm: 55, hauteurMm: 135, surfaceCm2 },
      rognage: { x0: 0, y0: 0, x1: 200, y1: 400 },
      mots,
    },
  ],
  polices: { Test: POLICE },
  traces: [],
  texte: mots.map((m) => m.texte).join(" "),
});

describe("tranches de surface — PRO-QHS-013 §12", () => {
  it("applique 0,9 mm jusqu'à 80 cm² et 1,2 mm au-delà", () => {
    expect(trancheSurface(9).seuilHauteurXmm).toBe(0.9);
    expect(trancheSurface(20).seuilHauteurXmm).toBe(0.9);
    expect(trancheSurface(74.25).seuilHauteurXmm).toBe(0.9);
    expect(trancheSurface(80).seuilHauteurXmm).toBe(0.9);
    expect(trancheSurface(80.1).seuilHauteurXmm).toBe(1.2);
  });

  it("ne réduit les mentions obligatoires que sous 10 cm²", () => {
    expect(trancheSurface(9.9).mentionsReduites).toBe(true);
    expect(trancheSurface(10).mentionsReduites).toBe(false);
  });

  it("exempte d'étiquetage nutritionnel sous 25 cm² seulement", () => {
    expect(trancheSurface(24.9).exemptionNutritionnelle).toBe(true);
    expect(trancheSurface(25).exemptionNutritionnelle).toBe(false);
  });
});

describe("hauteur des chiffres — PRO-QHS-013 §4", () => {
  it("suit les quatre paliers de grammage", () => {
    expect(seuilHauteurChiffresMm(50)).toBe(2);
    expect(seuilHauteurChiffresMm(50.1)).toBe(3);
    expect(seuilHauteurChiffresMm(200)).toBe(3);
    expect(seuilHauteurChiffresMm(200.1)).toBe(4);
    expect(seuilHauteurChiffresMm(1000)).toBe(4);
    expect(seuilHauteurChiffresMm(1000.1)).toBe(6);
  });

  it("convertit les kilos et refuse ce qui n'est pas une masse", () => {
    expect(poidsNetEnGrammes("1,5 kg")).toBe(1500);
    expect(poidsNetEnGrammes("100 g")).toBe(100);
    expect(poidsNetEnGrammes("20 sachets")).toBeNull();
  });
});

describe("contrôles typographiques mesurés", () => {
  const entree = {
    denomination: "Infusion citronnelle",
    poidsNet: "100 g",
  };

  it("mesure la hauteur de x et conclut à la conformité", () => {
    // 10 pt × 500/1000 × 25,4/72 = 1,764 mm — au-dessus du seuil 0,9 mm.
    const a = face(74.25, [mot("Infusion", 10), mot("citronnelle", 10), mot("100g", 10)]);
    const x = controlerTypographie([a], entree).find((c) => c.checklistId === "14.1");
    expect(x?.statut).toBe("PASS");
    expect(x?.justification).toContain("1.764 mm");
    expect(x?.origine).toBe("texte");
  });

  it("déclare non conforme une mention sous le seuil", () => {
    // 5 pt × 500/1000 × 25,4/72 = 0,882 mm — sous 0,9 mm.
    const a = face(74.25, [mot("Infusion", 5), mot("citronnelle", 5), mot("100g", 10)]);
    const x = controlerTypographie([a], entree).find((c) => c.checklistId === "14.1");
    expect(x?.statut).toBe("FAIL");
    expect(x?.justification).toContain("Sous le seuil");
  });

  it("retient la plus petite occurrence d'une mention répétée", () => {
    const grande = face(74.25, [mot("Infusion", 20), mot("citronnelle", 20)]);
    const petite = face(30, [mot("Infusion", 5), mot("citronnelle", 5)]);
    const x = controlerTypographie([grande, petite], entree).find((c) => c.checklistId === "14.1");
    expect(x?.statut).toBe("FAIL");
  });

  it("ne mesure pas un mot homonyme isolé loin de sa mention", () => {
    // « Infusion » seul, noyé dans du texte marketing en petit corps : il ne
    // forme pas la mention, il ne doit pas la faire échouer.
    const mots = [
      mot("Infusion", 10),
      mot("citronnelle", 10),
      ...Array.from({ length: 30 }, (_, i) => mot(`remplissage${i}`, 4)),
      mot("Infusion", 4),
    ];
    const x = controlerTypographie([face(74.25, mots)], { denomination: "Infusion citronnelle" });
    expect(x.find((c) => c.checklistId === "14.1")?.statut).toBe("PASS");
  });

  it("n'invente aucune mesure quand le corps est absent", () => {
    const a = face(74.25, [mot("Infusion", null), mot("citronnelle", null)]);
    const x = controlerTypographie([a], { denomination: "Infusion citronnelle" }).find(
      (c) => c.checklistId === "14.1"
    );
    expect(x?.statut).toBe("WARNING");
    expect(x?.justification).toContain("corps n'a pas pu être lu");
  });

  it("dit que le seuil est indéterminable sans zone de coupe", () => {
    const a = face(null, [mot("Infusion", 10)]);
    const x = controlerTypographie([a], entree).find((c) => c.checklistId === "14.1");
    expect(x?.statut).toBe("WARNING");
    expect(x?.justification).toContain("TrimBox");
  });

  it("mesure les chiffres du poids net contre le palier du grammage", () => {
    // 10 pt × 700/1000 × 25,4/72 = 2,469 mm — sous les 3 mm exigés pour 100 g.
    const a = face(74.25, [mot("100g", 10)]);
    const q = controlerTypographie([a], { poidsNet: "100 g" }).find((c) => c.checklistId === "6.2");
    expect(q?.statut).toBe("FAIL");
    expect(q?.justification).toContain("2.469 mm");
  });

  it("conclut sur la seule hauteur quand elle passe", () => {
    // 15 pt × 700/1000 × 25,4/72 = 3,704 mm — au-dessus des 3 mm. Le « même
    // champ visuel » qu'exige le même §4 est mesuré à part (positions.ts) et
    // rattaché au même point 6.2 : ce contrôle-ci ne répond que de la hauteur.
    const a = face(74.25, [mot("100g", 15)]);
    const q = controlerTypographie([a], { poidsNet: "100 g" }).find((c) => c.checklistId === "6.2");
    expect(q?.statut).toBe("PASS");
    expect(q?.justification).toContain("3.704 mm");
  });

  it("signale l'exemption nutritionnelle sous 25 cm², et seulement là", () => {
    const petite = controlerTypographie([face(20, [mot("Infusion", 10)])], entree);
    expect(petite.find((c) => c.checklistId === "4.1")?.statut).toBe("PASS");
    const grande = controlerTypographie([face(74.25, [mot("Infusion", 10)])], entree);
    expect(grande.find((c) => c.checklistId === "4.1")).toBeUndefined();
  });
});
