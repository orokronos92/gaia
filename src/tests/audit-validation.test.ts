import { describe, it, expect } from "vitest";

import {
  appliquerValidation,
  appliquerValidations,
  empreinteConstat,
  refusMotif,
  type ValidationControle,
} from "../lib/audit/validation";
import type { ControlResult } from "../lib/audit/types";

const point = (
  id: string,
  statut: ControlResult["statut"],
  justification: string
): ControlResult => ({
  id,
  typeControle: "TYPO_HAUTEUR_X",
  mode: "manual",
  statut,
  action: statut === "FAIL" ? "CORRIGER" : "VERIFIER",
  justification,
});

const decision = (
  r: ControlResult,
  decision: ValidationControle["decision"] = "VERIFIE"
): ValidationControle => ({
  pointId: r.id,
  decision,
  justification: null,
  empreinte: empreinteConstat(r),
  valideParNom: "Marie",
  valideLe: new Date("2026-09-08T10:00:00Z"),
});

describe("empreinte du constat", () => {
  it("change dès que le contrôle ne dit plus la même chose", () => {
    const a = point("14.1", "WARNING", "hauteur de x 1,067 mm");
    expect(empreinteConstat(a)).toBe(empreinteConstat({ ...a }));
    expect(empreinteConstat(a)).not.toBe(
      empreinteConstat(point("14.1", "WARNING", "hauteur de x 0,84 mm"))
    );
    expect(empreinteConstat(a)).not.toBe(empreinteConstat(point("14.1", "FAIL", "hauteur de x 1,067 mm")));
  });
});

describe("application d'une décision", () => {
  it("referme le point quand le constat n'a pas bougé", () => {
    const r = point("14.1", "WARNING", "conforme, marge 0,167 mm");
    const applique = appliquerValidation(r, decision(r));
    expect(applique.action).toBe("RIEN");
    expect(applique.validation?.perimee).toBe(false);
    // Le statut mesuré reste ce qu'il est : une décision ne réécrit pas le constat.
    expect(applique.statut).toBe("WARNING");
  });

  it("rouvre le point quand le constat a changé", () => {
    const avant = point("14.1", "WARNING", "conforme, marge 0,167 mm");
    const apres = point("14.1", "FAIL", "sous le seuil");
    const applique = appliquerValidation(apres, decision(avant));
    expect(applique.action).toBe("CORRIGER");
    expect(applique.validation?.perimee).toBe(true);
  });

  it("garde la trace de la validation périmée pour que Marie sache", () => {
    const avant = point("13.1", "WARNING", "12,78 × 8,52 mm");
    const apres = point("13.1", "WARNING", "9,00 × 6,00 mm");
    const applique = appliquerValidation(apres, decision(avant));
    expect(applique.validation?.parNom).toBe("Marie");
    expect(applique.validation?.perimee).toBe(true);
  });

  it("laisse intact un point sans décision", () => {
    const r = point("8.1", "WARNING", "x");
    expect(appliquerValidation(r, undefined)).toEqual(r);
  });

  it("n'applique une décision qu'au point qu'elle vise", () => {
    const a = point("14.1", "WARNING", "a");
    const b = point("13.1", "WARNING", "b");
    const [x, y] = appliquerValidations([a, b], [decision(a)]);
    expect(x.action).toBe("RIEN");
    expect(y.action).toBe("VERIFIER");
  });
});

describe("recevabilité d'une décision", () => {
  it("exige un motif pour une dérogation", () => {
    expect(refusMotif("DEROGATION", "FAIL", null)).toContain("motif");
    expect(refusMotif("DEROGATION", "FAIL", "   ")).toContain("motif");
    expect(refusMotif("DEROGATION", "FAIL", "Karrame l'assume")).toBeNull();
  });

  it("refuse de clore une non-conformité prouvée par une simple vérification", () => {
    // Une dérogation doit rester lisible, pas se fondre dans du vert.
    expect(refusMotif("VERIFIE", "FAIL", null)).toContain("dérogation");
  });

  it("n'exige rien pour cocher une alerte", () => {
    expect(refusMotif("VERIFIE", "WARNING", null)).toBeNull();
  });
});
