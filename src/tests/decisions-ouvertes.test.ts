import { describe, expect, it } from "vitest";
import { estTranche } from "../lib/audit/decisions";
import { verdictChecklist } from "../lib/audit/synthesis";
import { appliquerValidation, empreinteConstat, refusMotif, type ConstatValidable, type ValidationControle } from "../lib/audit/validation";

/** Lot 3 (2026-09-24): BAT to redo and awaiting information keep the line open. */
const ecart: ConstatValidable = { id: "2.5", statut: "FAIL" as const, action: "CORRIGER" as const, justification: "fiche « pétales de fleurs* », étiquette « pétales de rose* »." };

const decision = (d: ValidationControle["decision"], empreinte = empreinteConstat(ecart)): ValidationControle => ({
  pointId: "2.5",
  decision: d,
  justification: "motif",
  empreinte,
  valideParNom: "Marie",
  valideLe: new Date("2026-09-24"),
});

describe("décisions qui ne closent pas le point", () => {
  it("BAT à refaire : la ligne reste à corriger, avec le badge", () => {
    const r = appliquerValidation(ecart, decision("BAT_A_REFAIRE"));
    expect(r.action).toBe("CORRIGER");
    expect(r.validation?.decision).toBe("BAT_A_REFAIRE");
    expect(estTranche(r.validation)).toBe(false);
  });

  it("en attente d'info : idem, et le verdict reste non conforme", () => {
    const r = appliquerValidation(ecart, decision("EN_ATTENTE"));
    expect(r.action).toBe("CORRIGER");
    expect(verdictChecklist([r]).verdict).toBe("NON_CONFORME");
  });

  it("arbitrer (dérogation) clôt le point", () => {
    const r = appliquerValidation(ecart, decision("DEROGATION"));
    expect(r.action).toBe("RIEN");
    expect(estTranche(r.validation)).toBe(true);
    expect(verdictChecklist([r]).verdict).toBe("CONFORME_SOUS_DEROGATION");
  });

  it("le constat change (nouveau BAT) : la décision est périmée", () => {
    const r = appliquerValidation(ecart, decision("BAT_A_REFAIRE", "autre-empreinte"));
    expect(r.validation?.perimee).toBe(true);
  });

  it("en attente d'info demande de dire quoi et de qui", () => {
    expect(refusMotif("EN_ATTENTE", "FAIL", "  ")).not.toBeNull();
    expect(refusMotif("EN_ATTENTE", "FAIL", "Composition confirmée par Pascal ?")).toBeNull();
    expect(refusMotif("BAT_A_REFAIRE", "FAIL", null)).toBeNull();
  });
});
