import { describe, it, expect } from "vitest";

import { controlerPropositions, lireCodeEtiquette, proposerPoidsNet } from "../lib/audit/visual/propositions";
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
  pages: [
    { largeurPt: 200, hauteurPt: 400, coupe: null, rognage: { x0: 0, y0: 0, x1: 200, y1: 400 }, mots: mots.map(mot) },
  ],
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

/** Une fiche déjà renseignée sur tout sauf ce que le test regarde. */
const FICHE_COMPLETE = { poidsNet: "100 g", codeEtiquette: "ETCRA2372V6" };

describe("proposition du code étiquette lu sur le BAT", () => {
  it("propose le seul code imprimé", () => {
    const lu = lireCodeEtiquette([face(["Poire", "Belle-Hélène", "ETCRA2372V6", "100g"])]);
    expect(lu.propose?.valeur).toBe("ETCRA2372V6");
    expect(lu.propose?.table).toBe("fiche");
    expect(lu.propose?.champ).toBe("codeEtiquette");
  });

  it("reconnaît aussi la face unique, sans C de contre-étiquette", () => {
    expect(lireCodeEtiquette([face(["ETTUTO3542"])]).propose?.valeur).toBe("ETTUTO3542");
  });

  it("ne prend pas pour un code un mot qui y ressemble", () => {
    // « ETE » ou une origine ne doivent jamais devenir une identité de BAT.
    const lu = lireCodeEtiquette([face(["ETE", "FR-BIO-01", "3", "5828", "ETIQUETTE"])]);
    expect(lu.propose).toBeNull();
  });

  it("ne propose rien quand le dossier couvre plusieurs conditionnements", () => {
    // Dix produits du catalogue partagent un dossier de BAT : deux codes y sont
    // imprimés, et rien ne dit lequel est celui de cette fiche.
    const lu = lireCodeEtiquette([face(["ETCBN4042V6"]), face(["ETCBN4046V6"])]);
    expect(lu.propose).toBeNull();
    expect(lu).toHaveProperty("motif", expect.stringContaining("ETCBN4042V6"));
  });

  it("cite le nom des fichiers quand le BAT est vectorisé", () => {
    // 41 produits n'impriment aucun mot lisible : on ne propose pas, mais Marie
    // doit voir la valeur plutôt que d'aller ouvrir MinIO.
    const lu = lireCodeEtiquette([face([])], ["ETCVN4312V5-Pin Ho Jade.pdf"]);
    expect(lu.propose).toBeNull();
    expect(lu).toHaveProperty("motif", expect.stringContaining("ETCVN4312V5"));
  });
});

describe("émission du constat", () => {
  it("propose quand la fiche est muette", () => {
    const c = controlerPropositions([face(["poids", "net", "100g"])], {
      ...FICHE_COMPLETE,
      poidsNet: null,
    });
    expect(c).toHaveLength(1);
    expect(c[0].checklistId).toBe("6.1");
    expect(c[0].proposition?.valeur).toBe("100 g");
    expect(c[0].manqueSurLaFiche).toBe("la quantité nette");
  });

  it("se tait quand la fiche porte déjà la donnée", () => {
    // Là, c'est la comparaison BAT ↔ fiche qui a du sens, pas une proposition.
    expect(controlerPropositions([face(["poids", "net", "100g"])], FICHE_COMPLETE)).toHaveLength(0);
  });

  it("rattache le code étiquette au point 15.1", () => {
    const c = controlerPropositions([face(["ETCRA2372V6"])], {
      ...FICHE_COMPLETE,
      codeEtiquette: null,
    });
    expect(c).toHaveLength(1);
    expect(c[0].checklistId).toBe("15.1");
    expect(c[0].proposition?.valeur).toBe("ETCRA2372V6");
  });

  it("émet quand même le constat sans proposition, plutôt que de se taire", () => {
    // Un point muet est un point qu'on croit vérifié : le catalogue n'a pas un
    // seul code étiquette au dossier, il faut que 15.1 le dise.
    const c = controlerPropositions([face([])], { ...FICHE_COMPLETE, codeEtiquette: null });
    expect(c).toHaveLength(1);
    expect(c[0].proposition).toBeUndefined();
    expect(c[0].manqueSurLaFiche).toBe("le code étiquette");
  });
});
