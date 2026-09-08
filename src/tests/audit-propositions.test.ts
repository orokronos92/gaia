import { describe, it, expect } from "vitest";

import { controlerPropositions, proposerPoidsNet } from "../lib/audit/visual/propositions";
import type { AnalyseBat, MotBat } from "../lib/utils/pdf-bat";

const mot = (texte: string): MotBat => ({
  texte,
  x: 0,
  y: 0,
  largeur: 10,
  hauteur: 5,
  corpsPt: 7,
  police: "Test",
});

const face = (mots: string[]): AnalyseBat => ({
  pages: [{ largeurPt: 200, hauteurPt: 400, coupe: null, mots: mots.map(mot) }],
  polices: {},
  traces: [],
  texte: mots.join(" "),
});

describe("proposition du poids net lu sur le BAT", () => {
  it("lit la masse qui suit « poids net »", () => {
    const p = proposerPoidsNet([face(["poids", "net", "100g"])]);
    expect(p?.valeur).toBe("100 g");
    expect(p?.champ).toBe("poidsNet");
  });

  it("convertit les kilos sans les réécrire", () => {
    expect(proposerPoidsNet([face(["poids", "net", "1,5", "kg"])])?.valeur).toBeUndefined();
    expect(proposerPoidsNet([face(["poids", "net", "1,5kg"])])?.valeur).toBe("1,5 kg");
  });

  it("ignore un grammage qui n'est pas le poids net", () => {
    // « 2g / tasse » traîne sur toutes les étiquettes de thé : le proposer
    // ferait enregistrer une dose comme quantité nette, d'un clic.
    expect(proposerPoidsNet([face(["2g", "TASSE", "50", "TASSES"])])).toBeNull();
  });

  it("ne propose rien si deux valeurs se contredisent", () => {
    const a = face(["poids", "net", "100g"]);
    const b = face(["poids", "net", "250g"]);
    expect(proposerPoidsNet([a, b])).toBeNull();
  });
});

describe("émission du constat", () => {
  it("propose quand la fiche est muette", () => {
    const c = controlerPropositions([face(["poids", "net", "100g"])], { poidsNet: null });
    expect(c).toHaveLength(1);
    expect(c[0].checklistId).toBe("6.1");
    expect(c[0].proposition?.valeur).toBe("100 g");
  });

  it("se tait quand la fiche porte déjà la donnée", () => {
    // Là, c'est la comparaison BAT ↔ fiche qui a du sens, pas une proposition.
    expect(controlerPropositions([face(["poids", "net", "100g"])], { poidsNet: "100 g" })).toHaveLength(0);
  });
});
