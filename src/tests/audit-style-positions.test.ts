import { describe, it, expect } from "vitest";

import { controlerPositions } from "../lib/audit/visual/positions";
import { controlerStyle } from "../lib/audit/visual/style-typo";
import type { AnalyseBat, MetriquePolice, MotBat } from "../lib/utils/pdf-bat";

const police = (nom: string, poids: number, angle = 0, flags = 32): MetriquePolice => ({
  nom,
  xHeight: 500,
  capHeight: 700,
  fontWeight: poids,
  italicAngle: angle,
  flags,
});

const POLICES: Record<string, MetriquePolice> = {
  Corps: police("Corps", 400),
  Gras: police("Gras", 700),
  GrasItalique: police("GrasItalique", 700, -12),
};

const mot = (texte: string, nomPolice: string | null = "Corps", x = 0, y = 0): MotBat => ({
  texte,
  x,
  y,
  largeur: 10,
  hauteur: 5,
  corpsPt: nomPolice === null ? null : 10,
  police: nomPolice,
});

const face = (mots: MotBat[]): AnalyseBat => ({
  pages: [
    {
      largeurPt: 200,
      hauteurPt: 400,
      coupe: { largeurMm: 55, hauteurMm: 135, surfaceCm2: 74.25 },
      mots,
    },
  ],
  polices: POLICES,
  traces: [],
  texte: mots.map((m) => m.texte).join(" "),
});

describe("mise en évidence des allergènes — §3.1", () => {
  const entree = {
    allergenes: "amande",
    ingredients: "Thé vert, amande, cannelle, gingembre",
  };

  it("valide un allergène composé dans une autre police que la liste", () => {
    const a = face([
      mot("Thé"),
      mot("amande", "Gras"),
      mot("cannelle"),
      mot("gingembre"),
    ]);
    const c = controlerStyle([a], entree)[0];
    expect(c.statut).toBe("PASS");
    expect(c.justification).toContain("distinct du reste de la liste");
  });

  it("ne conclut pas à la faute quand la graisse ne distingue rien", () => {
    // Le soulignement est un trait vectoriel, pas du texte : on ne peut pas
    // prouver son absence, donc on ne peut pas prouver la non-conformité.
    const a = face([mot("amande"), mot("cannelle"), mot("gingembre")]);
    const c = controlerStyle([a], entree)[0];
    expect(c.statut).toBe("WARNING");
    expect(c.justification).toContain("soulignement");
  });

  it("n'émet rien quand la fiche ne déclare aucun allergène", () => {
    const a = face([mot("amande")]);
    expect(controlerStyle([a], { ingredients: entree.ingredients })).toHaveLength(0);
  });
});

describe("style du mot demeter — §11.1", () => {
  it("valide un demeter en gras italique", () => {
    const a = face([mot("demeter", "GrasItalique")]);
    const c = controlerStyle([a], { estDemeter: true })[0];
    expect(c.statut).toBe("PASS");
    expect(c.checklistId).toBe("2.4");
  });

  it("refuse un demeter en gras droit", () => {
    const a = face([mot("demeter", "Gras")]);
    const c = controlerStyle([a], { estDemeter: true })[0];
    expect(c.statut).toBe("FAIL");
    expect(c.justification).toContain("droit");
  });

  it("reste muet sur un produit non Demeter dont l'étiquette ne porte pas le mot", () => {
    expect(controlerStyle([face([mot("thé")])], { estDemeter: false })).toHaveLength(0);
  });

  it("alerte si le produit est Demeter mais le mot introuvable", () => {
    const c = controlerStyle([face([mot("thé")])], { estDemeter: true })[0];
    expect(c.statut).toBe("WARNING");
  });
});

describe("même champ visuel — §1 et §4", () => {
  const entree = { denomination: "Infusion citronnelle", poidsNet: "100 g" };

  it("constate le même champ visuel sur une face commune", () => {
    const a = face([mot("Infusion"), mot("citronnelle"), mot("100g", "Corps", 30, 40)]);
    const c = controlerPositions([a], entree).find((x) => x.checklistId === "1.4");
    expect(c?.justification).toContain("même champ visuel");
  });

  it("signale deux faces différentes", () => {
    const avant = face([mot("Infusion"), mot("citronnelle")]);
    const arriere = face([mot("100g")]);
    const c = controlerPositions([avant, arriere], entree).find((x) => x.checklistId === "1.4");
    expect(c?.justification).toContain("champs visuels différents");
  });

  it("rattache le même constat au point 6.2", () => {
    const a = face([mot("Infusion"), mot("citronnelle"), mot("100g")]);
    const ids = controlerPositions([a], entree).map((x) => x.checklistId);
    expect(ids).toContain("1.4");
    expect(ids).toContain("6.2");
  });

  it("ne tranche pas si le poids net est introuvable", () => {
    const a = face([mot("Infusion"), mot("citronnelle")]);
    const c = controlerPositions([a], entree).find((x) => x.checklistId === "1.4");
    expect(c?.statut).toBe("WARNING");
    expect(c?.justification).toContain("non vérifiable");
  });
});

describe("origine sous le code OC — §6", () => {
  it("valide une origine placée en dessous du code", () => {
    // Les ordonnées de poppler croissent vers le bas.
    const a = face([mot("FR-BIO-01", "Corps", 0, 100), mot("AGRICULTURE", "Corps", 0, 110)]);
    const c = controlerPositions([a], {}).find((x) => x.checklistId === "8.1");
    expect(c?.statut).toBe("WARNING");
    expect(c?.justification).toContain("sous FR-BIO-01");
  });

  it("refuse une origine placée au-dessus du code", () => {
    const a = face([mot("FR-BIO-01", "Corps", 0, 110), mot("AGRICULTURE", "Corps", 0, 100)]);
    const c = controlerPositions([a], {}).find((x) => x.checklistId === "8.1");
    expect(c?.statut).toBe("FAIL");
    expect(c?.justification).toContain("AU-DESSUS");
  });

  it("refuse un code et une origine sur deux faces", () => {
    const c = controlerPositions([face([mot("FR-BIO-01")]), face([mot("AGRICULTURE")])], {}).find(
      (x) => x.checklistId === "8.1"
    );
    expect(c?.statut).toBe("FAIL");
  });

  it("reconnaît le code quel que soit le séparateur de la maquette", () => {
    const a = face([mot("FR BIO 01", "Corps", 0, 100), mot("AGRICULTURE", "Corps", 0, 110)]);
    const c = controlerPositions([a], {}).find((x) => x.checklistId === "8.1");
    expect(c?.justification).toContain("sous FR-BIO-01");
  });
});
