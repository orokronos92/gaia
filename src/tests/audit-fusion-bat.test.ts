import { describe, it, expect } from "vitest";

import { appliquerPreuves, fusionner, preuvesParPoint } from "../lib/audit/fusion-bat";
import type { BatTextCheck } from "../lib/audit/visual/text-robot";
import type { ControlResult } from "../lib/audit/types";

const point = (id: string, mode: ControlResult["mode"], statut: ControlResult["statut"], action: ControlResult["action"]): ControlResult =>
  ({ id, typeControle: "EUROFEUILLE", mode, statut, action, justification: "initial" });

const bat = (checklistId: string, statut: BatTextCheck["statut"], origine: BatTextCheck["origine"]): BatTextCheck =>
  ({ id: "X", checklistId, origine, rubrique: "R", libelle: "L", statut, justification: "constat du BAT" });

describe("fusion des résultats BAT dans la checklist", () => {
  it("range les preuves par point de checklist", () => {
    const p = preuvesParPoint([bat("13.1", "PASS", "visuel"), bat("12.1", "FAIL", "visuel")]);
    expect(Object.keys(p).sort()).toEqual(["12.1", "13.1"]);
  });

  it("ignore un contrôle BAT non rattaché", () => {
    const orphelin: BatTextCheck = { id: "X", rubrique: "R", libelle: "L", statut: "PASS", justification: "j" };
    expect(preuvesParPoint([orphelin])).toEqual({});
  });

  it("du CODE qui lit le BAT peut trancher un point visuel", () => {
    const r = appliquerPreuves(point("7.2", "manual", "WARNING", "VERIFIER"), [
      { libelle: "L", statut: "PASS", justification: "mention présente", origine: "texte" },
    ]);
    expect(r.statut).toBe("PASS");
    expect(r.action).toBe("RIEN");
  });

  it("un MODÈLE oriente le regard, il ne remplace pas la confirmation", () => {
    const r = appliquerPreuves(point("13.1", "manual", "WARNING", "VERIFIER"), [
      { libelle: "L", statut: "PASS", justification: "Eurofeuille détectée", origine: "visuel" },
    ]);
    expect(r.action).toBe("VERIFIER");
    expect(r.justification).toContain("à confirmer");
    expect(r.justification).toContain("Eurofeuille détectée");
  });

  it("une non-conformité prouvée remonte en CORRIGER, quelle que soit son origine", () => {
    for (const origine of ["texte", "visuel", "semantique"] as const) {
      const r = appliquerPreuves(point("13.4", "manual", "WARNING", "VERIFIER"), [
        { libelle: "L", statut: "FAIL", justification: "Point Vert détecté", origine },
      ]);
      expect(r.action).toBe("CORRIGER");
      expect(r.statut).toBe("FAIL");
    }
  });

  it("n'écrase jamais un verdict déterministe rendu sur la fiche", () => {
    const r = appliquerPreuves(point("6.1", "deterministic", "PASS", "RIEN"), [
      { libelle: "L", statut: "WARNING", justification: "poids non retrouvé", origine: "texte" },
    ]);
    // Les deux répondent à deux questions : la donnée, et son impression.
    expect(r.statut).toBe("PASS");
    expect(r.justification).toContain("initial");
    expect(r.justification).toContain("poids non retrouvé");
  });

  it("laisse intacts les points sans preuve", () => {
    const liste = [point("1.0", "llm", "WARNING", "VERIFIER")];
    expect(fusionner(liste, [])).toEqual(liste);
  });
});
