import { describe, it, expect } from "vitest";
import {
  controlerCoherenceEtiquette,
  motsSignifiants,
  type LigneEtiquetteBat,
} from "../lib/audit/visual/coherence-etiquette";
import type { AnalyseBat, MotBat } from "../lib/utils/pdf-bat";

/**
 * Point 2.5 — la recette étiquette contre ce que le BAT imprime.
 *
 * Le cas qui a motivé le contrôle : la recette de production dit
 * « SORWATHE OP1 », le BAT imprime « thé noir », et personne ne le voyait.
 * Depuis la fiche seule, aucun code ne peut trancher — rien ne distingue
 * « SORWATHE OP1 » de « THYM ». Le BAT, lui, tranche sans deviner.
 */

const mot = (texte: string): MotBat => ({
  texte,
  x: 0,
  y: 0,
  largeur: 10,
  hauteur: 5,
  corpsPt: 7,
  police: "Test",
});

const face = (texte: string): AnalyseBat => {
  const mots = texte.split(/\s+/).filter(Boolean);
  return {
    pages: [
      {
        largeurPt: 200,
        hauteurPt: 400,
        coupe: null,
        rognage: { x0: 0, y0: 0, x1: 200, y1: 400 },
        mots: mots.map(mot),
      },
    ],
    polices: {},
    traces: [],
    texte: mots.join(" "),
  };
};

/** Liste réellement imprimée sur le BAT du Maté sportif (ETCMT2652V5). */
const BAT_MT265 = face(
  `INGRÉDIENTS maté vert* 62%, gingembre* 15,5%, guarana* 6%, hibiscus* 6%,
   menthe poivrée*, huile essentielle d'orange sanguine* 4%, ginseng* 2%, stevia*.
   *Issu de l'agriculture biologique.`
);

const ligne = (
  designation: string,
  pourcentage: number,
  designationRecette = designation,
  masque = false
): LigneEtiquetteBat => ({ designation, designationRecette, pourcentage, masque });

describe("2.5 — la recette étiquette contre le BAT", () => {
  it("les dénominations relues se lisent sur le BAT → PASS", () => {
    const r = controlerCoherenceEtiquette([BAT_MT265], {
      lignesEtiquette: [
        ligne("maté vert", 62, "MATE VERT"),
        ligne("gingembre", 15.5, "GINGEMBRE"),
        ligne("hibiscus", 6, "HIBISCUS"),
      ],
    });
    expect(r?.statut).toBe("PASS");
  });

  it("un nom jamais relu → WARNING : c'est du travail en attente, pas une faute", () => {
    const r = controlerCoherenceEtiquette([BAT_MT265], {
      lignesEtiquette: [ligne("SORWATHE OP1", 62)],
    });
    expect(r?.statut).toBe("WARNING");
    expect(r?.justification).toContain("SORWATHE OP1");
    expect(r?.justification).toContain("jamais relue");
  });

  it("un nom relu que le BAT n'imprime pas → FAIL : les deux documents se contredisent", () => {
    const r = controlerCoherenceEtiquette([BAT_MT265], {
      lignesEtiquette: [ligne("rooibos", 62, "RB120")],
    });
    expect(r?.statut).toBe("FAIL");
    expect(r?.justification).toContain("rooibos");
    expect(r?.justification).not.toContain("jamais relue");
  });

  it("un pourcentage que le BAT n'imprime pas → WARNING", () => {
    const r = controlerCoherenceEtiquette([BAT_MT265], {
      lignesEtiquette: [ligne("maté vert", 61, "MATE VERT")],
    });
    expect(r?.statut).toBe("WARNING");
    expect(r?.justification).toContain("61 %");
  });

  it("un % volontairement masqué n'est pas réclamé sur le BAT", () => {
    const r = controlerCoherenceEtiquette([BAT_MT265], {
      lignesEtiquette: [ligne("menthe poivrée", 4, "MENTHE POIVREE", true)],
    });
    expect(r?.statut).toBe("PASS");
  });

  it("une dénomination trop courte pour être cherchée est signalée, pas condamnée", () => {
    const r = controlerCoherenceEtiquette([BAT_MT265], {
      lignesEtiquette: [ligne("OP1", 62)],
    });
    expect(r?.statut).toBe("WARNING");
    expect(r?.justification).toContain("à vérifier à l'œil");
  });

  it("sans recette étiquette, il ne conclut pas", () => {
    expect(controlerCoherenceEtiquette([BAT_MT265], {})?.statut).toBe("WARNING");
    expect(controlerCoherenceEtiquette([BAT_MT265], { lignesEtiquette: [] })?.statut).toBe(
      "WARNING"
    );
  });

  it("répond au point 2.5 de la checklist", () => {
    expect(controlerCoherenceEtiquette([BAT_MT265], { lignesEtiquette: [] })?.checklistId).toBe(
      "2.5"
    );
  });
});

describe("mots signifiants d'une dénomination", () => {
  it("écarte les mots vides et les mots trop courts", () => {
    expect(motsSignifiants("huile essentielle d'orange sanguine")).toEqual([
      "huile",
      "essentielle",
      "orange",
      "sanguine",
    ]);
    expect(motsSignifiants("arôme naturel de figue")).toEqual(["arome", "figue"]);
    expect(motsSignifiants("OP1")).toEqual([]);
  });

  it("garde les chiffres qui font partie du nom", () => {
    expect(motsSignifiants("AROME BIO 2022 figue")).toEqual(["arome", "2022", "figue"]);
  });
});
