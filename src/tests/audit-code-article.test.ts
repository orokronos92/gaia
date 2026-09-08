import { describe, it, expect } from "vitest";

import {
  cleEan13,
  decomposerCodeArticle,
  decomposerGencode,
  poidsEnGrammes,
} from "../lib/audit/code-article";
import {
  checkCodeConditionnement,
  checkCodePoidsCoherent,
  checkGencodeCoherent,
  checkGencodeUnicite,
} from "../lib/audit/deterministic/code-article";
import type { AuditInput } from "../lib/audit/types";

/** Fiche minimale : seuls les champs produit comptent pour ces contrôles. */
const input = (produit: AuditInput["produit"]): AuditInput => ({
  fiche: {},
  produit,
  ingredients: [],
});

describe("code article — MOP-PRO-029 §2.1", () => {
  it("décompose famille, article et conditionnement", () => {
    expect(decomposerCodeArticle("TA7372")).toEqual({
      famille: "TA",
      article: "737",
      conditionnement: "2",
      extension: null,
    });
  });

  it("accepte un code historique sans conditionnement", () => {
    expect(decomposerCodeArticle("TH200")?.conditionnement).toBeNull();
  });

  it("reconnaît une extension de code (§2.1.4)", () => {
    expect(decomposerCodeArticle("TR250CI")).toEqual({
      famille: "TR",
      article: "250",
      conditionnement: null,
      extension: "CI",
    });
  });

  it("lit le poids net avec ou sans unité", () => {
    expect(poidsEnGrammes("100")).toBe(100);
    expect(poidsEnGrammes("100 g")).toBe(100);
    expect(poidsEnGrammes("1,5 kg")).toBe(1500);
    // Sans unité, une valeur ≤ 10 se lit en kg : « 1 » est un kilo, pas un gramme.
    expect(poidsEnGrammes("1")).toBe(1000);
    expect(poidsEnGrammes("3 pièces")).toBeNull();
  });
});

describe("16.1 — chiffre de conditionnement", () => {
  it("PASS sur un code complet", () => {
    const v = checkCodeConditionnement(input({ codePf: "TA7372" }));
    expect(v.statut).toBe("PASS");
    expect(v.justification).toContain("100 g");
  });

  it("WARNING sur un code historique, jamais FAIL", () => {
    expect(checkCodeConditionnement(input({ codePf: "TH200" })).statut).toBe("WARNING");
  });

  it("FAIL si le chiffre sort des sept valeurs définies", () => {
    expect(checkCodeConditionnement(input({ codePf: "TA7379" })).statut).toBe("FAIL");
  });
});

describe("16.2 — conditionnement ↔ poids net", () => {
  it("PASS : conditionnement 2 et 100 g", () => {
    expect(checkCodePoidsCoherent(input({ codePf: "TA7372", poidsNet: "100" })).statut).toBe("PASS");
  });

  it("PASS : conditionnement 2 couvre toute la plage ≥ 80 g", () => {
    expect(checkCodePoidsCoherent(input({ codePf: "TA7372", poidsNet: "90" })).statut).toBe("PASS");
  });

  it("FAIL : conditionnement 2 avec 70 g (cas réel TH0632)", () => {
    const v = checkCodePoidsCoherent(input({ codePf: "TH0632", poidsNet: "70" }));
    expect(v.statut).toBe("FAIL");
    expect(v.justification).toContain("70");
  });

  it("WARNING quand le poids n'est pas une masse — pas d'accusation sur une donnée illisible", () => {
    expect(
      checkCodePoidsCoherent(input({ codePf: "BT3542", poidsNet: "3 pièces" })).statut
    ).toBe("WARNING");
  });
});

describe("16.3 — Gencode cohérent (§3)", () => {
  it("PASS sur le cas de référence TA7372", () => {
    const v = checkGencodeCoherent(input({ codePf: "TA7372", codeEan: "3582810473726" }));
    expect(v.statut).toBe("PASS");
    expect(v.justification).toContain("article 737");
  });

  it("accepte le format historique : article sur 4 chiffres, sans conditionnement", () => {
    const v = checkGencodeCoherent(input({ codePf: "TH974", codeEan: "3582811009740" }));
    expect(v.statut).toBe("PASS");
    expect(v.justification).toContain("historique");
  });

  it("FAIL sur un code fabricant erroné (cas réel TA6692)", () => {
    const v = checkGencodeCoherent(input({ codePf: "TA6692", codeEan: "3585810866925" }));
    expect(v.statut).toBe("FAIL");
    expect(v.justification).toContain("fabricant");
  });

  it("FAIL quand l'article du Gencode n'est pas celui du produit (cas réel TA6092)", () => {
    const v = checkGencodeCoherent(input({ codePf: "TA6092", codeEan: "3582810360125" }));
    expect(v.statut).toBe("FAIL");
    expect(v.justification).toContain("601");
  });

  it("WARNING sans Gencode — non vérifiable n'est pas non conforme", () => {
    expect(checkGencodeCoherent(input({ codePf: "TA7372" })).statut).toBe("WARNING");
  });

  it("calcule la clé EAN-13 selon GS1", () => {
    expect(cleEan13("358281047372")).toBe("6");
  });

  it("préfère le format qui concorde avec le code produit", () => {
    expect(decomposerGencode("3582811009740", "974")?.format).toBe("historique");
    expect(decomposerGencode("3582810473726", "737")?.format).toBe("recent");
  });
});

describe("16.4 — unicité du Gencode", () => {
  it("PASS quand aucun autre produit ne le porte", () => {
    expect(
      checkGencodeUnicite(input({ codeEan: "3582810473726", eanPartagePar: [] })).statut
    ).toBe("PASS");
  });

  it("FAIL et nomme l'autre produit (cas réel TH5226 / TH5296)", () => {
    const v = checkGencodeUnicite(
      input({ codeEan: "3582811005223", eanPartagePar: ["TH5226"] })
    );
    expect(v.statut).toBe("FAIL");
    expect(v.justification).toContain("TH5226");
  });
});
