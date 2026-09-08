import { describe, it, expect } from "vitest";

import {
  controlerCodeOc,
  controlerEtoilesBio,
  controlerMentionOrigine,
  controlerModeEmploi,
  controlerMotIngredients,
  controlerSigneEstime,
} from "../lib/audit/visual/mentions-etiquette";
import type { AnalyseBat, MotBat } from "../lib/utils/pdf-bat";

const mot = (texte: string, y = 0): MotBat => ({
  texte,
  x: 0,
  y,
  largeur: 10,
  hauteur: 5,
  corpsPt: 7,
  police: "Test",
});

const face = (mots: MotBat[]): AnalyseBat => ({
  pages: [
    {
      largeurPt: 200,
      hauteurPt: 400,
      coupe: null,
      rognage: { x0: 0, y0: 0, x1: 200, y1: 400 },
      mots,
    },
  ],
  polices: {},
  traces: [],
  texte: mots.map((m) => m.texte).join(" "),
});

const mots = (...t: string[]) => face(t.map((x) => mot(x)));

describe("2.1 — le mot « ingrédients » précède la liste", () => {
  const fiche = { ingredients: "Thé noir*, honeybush*, figue* 19%." };

  it("valide quand l'en-tête précède le premier ingrédient", () => {
    const c = controlerMotIngredients([mots("INGRÉDIENTS", "Thé", "noir*,", "honeybush*.")], fiche);
    expect(c.statut).toBe("PASS");
    expect(c.reperes?.length).toBe(2);
  });

  it("retrouve l'ingrédient malgré la ponctuation du BAT", () => {
    // Poppler rend « noir*, » avec sa virgule ; la fiche écrit « noir* ».
    const c = controlerMotIngredients([mots("INGRÉDIENTS", "Thé", "noir*,")], fiche);
    expect(c.statut).toBe("PASS");
  });

  it("alerte si l'en-tête est absent", () => {
    const c = controlerMotIngredients([mots("Thé", "noir*,")], fiche);
    expect(c.statut).toBe("WARNING");
    expect(c.justification).toContain("n'a pas été retrouvé");
  });

  it("alerte si la liste ne suit pas l'en-tête", () => {
    const c = controlerMotIngredients([mots("Thé", "noir*,", "INGRÉDIENTS")], fiche);
    expect(c.statut).toBe("WARNING");
  });

  it("ne compare pas l'en-tête au préfixe de la fiche", () => {
    // Une fiche écrite « Ingrédients : thé noir* » ne doit pas se comparer à
    // elle-même : le premier ingrédient est « thé », pas « ingrédients ».
    const c = controlerMotIngredients([mots("INGRÉDIENTS", "Thé", "noir*,")], {
      ingredients: "Ingrédients : Thé noir*, honeybush*.",
    });
    expect(c.statut).toBe("PASS");
  });
});

describe("2.4 — étoiles et mention de certification", () => {
  it("se tait quand l'étiquette ne porte aucune étoile", () => {
    expect(controlerEtoilesBio([mots("Honeybush", "nature")])).toBeNull();
  });

  it("valide une étoile accompagnée de sa mention", () => {
    const c = controlerEtoilesBio([mots("Honeybush*.", "*Issu", "de", "l'agriculture", "biologique.")]);
    expect(c?.statut).toBe("PASS");
  });

  it("refuse une étoile sans mention", () => {
    const c = controlerEtoilesBio([mots("Honeybush*.", "poids", "net", "100g")]);
    expect(c?.statut).toBe("FAIL");
  });

  it("exige la mention biodynamique quand deux étoiles sont utilisées", () => {
    const c = controlerEtoilesBio([
      mots("Thé", "vert**,", "*Issu", "de", "l'agriculture", "biologique."),
    ]);
    expect(c?.statut).toBe("FAIL");
    expect(c?.justification).toContain("demeter");
  });
});

describe("13.2 — code de l'organisme de contrôle", () => {
  it("le reconnaît quel que soit le séparateur", () => {
    expect(controlerCodeOc([mots("CERTIFIÉ", "PAR", "FR-BIO-01")]).statut).toBe("PASS");
    expect(controlerCodeOc([mots("FR", "BIO", "01")]).statut).toBe("WARNING");
    expect(controlerCodeOc([mots("FRBIO01")]).statut).toBe("PASS");
  });

  it("n'affirme pas l'absence de ce qu'il n'a pas lu", () => {
    const c = controlerCodeOc([mots("Thé", "noir")]);
    expect(c.statut).toBe("WARNING");
    expect(c.justification).toContain("ne prouve pas son absence");
  });
});

describe("11.1 — le « ℮ » métrologique", () => {
  it("valide son absence", () => {
    expect(controlerSigneEstime([mots("poids", "net", "100g")]).statut).toBe("PASS");
  });

  it("refuse sa présence", () => {
    const c = controlerSigneEstime([mots("100g", "℮")]);
    expect(c.statut).toBe("FAIL");
    expect(c.reperes?.length).toBe(1);
  });
});

describe("8.2 — mention d'origine", () => {
  it("cite la suite de la même ligne, pas le bloc suivant", () => {
    const a = face([mot("AGRICULTURE", 100), mot("UE/non", 100), mot("UE", 100), mot("POUR", 200)]);
    const c = controlerMentionOrigine([a]);
    expect(c.justification).toContain("AGRICULTURE UE/non UE");
    expect(c.justification).not.toContain("POUR");
  });

  it("ne conclut pas : la cohérence à 98 % n'est pas dans le texte", () => {
    expect(controlerMentionOrigine([mots("AGRICULTURE", "UE")]).statut).toBe("WARNING");
  });
});

describe("7.1 — mode d'emploi rédigé", () => {
  it("valide quand durée et température sont écrites en caractères", () => {
    const c = controlerModeEmploi([mots("2g", "TASSE", "3min", "90°C")]);
    expect(c.statut).toBe("PASS");
    expect(c.justification).toContain("pas des symboles");
  });

  it("alerte quand rien n'est écrit", () => {
    expect(controlerModeEmploi([mots("Thé", "noir")]).statut).toBe("WARNING");
  });

  it("alerte sur un mode d'emploi partiel", () => {
    expect(controlerModeEmploi([mots("3min")]).statut).toBe("WARNING");
  });
});
