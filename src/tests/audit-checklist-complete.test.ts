import { describe, it, expect } from "vitest";

import { compterResteAFaire, construireChecklist } from "../lib/audit/checklist-complete";
import { CONTROL_CHECKLIST, partitionByMode } from "../lib/audit/control-checklist";
import type { AuditInput } from "../lib/audit/types";

/** Fiche vide : le pire cas, et celui que Marie rencontre en début de travail. */
const FICHE_VIDE: AuditInput = { fiche: {}, produit: {}, ingredients: [] };

describe("checklist complète — la liste de travail de Marie", () => {
  it("n'omet aucun point applicable du registre", () => {
    const res = construireChecklist(FICHE_VIDE);
    const ids = new Set(res.map((r) => r.id));
    // Tout point rendu vient du registre, et rien d'applicable n'est perdu.
    for (const r of res) expect(CONTROL_CHECKLIST.some((c) => c.id === r.id)).toBe(true);
    expect(ids.size).toBe(res.length);
    expect(res.length).toBeGreaterThan(20);
  });

  it("les points LLM et visuels ne sont plus muets", () => {
    const res = construireChecklist(FICHE_VIDE);
    const nonDeterministes = res.filter((r) => r.mode !== "deterministic");
    expect(nonDeterministes.length).toBeGreaterThan(0);
    for (const r of nonDeterministes) {
      expect(r.action).toBe("VERIFIER");
      expect(r.justification).toBeTruthy();
    }
  });

  it("distingue « compléter la fiche » de « vérifier sur le BAT »", () => {
    const res = construireChecklist(FICHE_VIDE);
    // Une fiche vide ne peut pas être conforme : elle est à COMPLÉTER.
    expect(res.some((r) => r.action === "COMPLETER")).toBe(true);
    // Un contrôle visuel n'est jamais « à compléter » : Marie doit regarder.
    for (const r of res.filter((x) => x.mode === "manual")) {
      expect(r.action).not.toBe("COMPLETER");
    }
  });

  it("rend les points dans l'ordre de la procédure", () => {
    const res = construireChecklist(FICHE_VIDE);
    const ordres = res.map((r) => CONTROL_CHECKLIST.find((c) => c.id === r.id)!.ordre);
    expect(ordres).toEqual([...ordres].sort((a, b) => a - b));
  });

  it("le décompte couvre tous les points, sans double compte", () => {
    const res = construireChecklist(FICHE_VIDE);
    const c = compterResteAFaire(res);
    expect(c.corriger + c.completer + c.verifier + c.fait + c.nonApplicable).toBe(res.length);
  });
});

describe("qui répond à quoi — répartition du registre", () => {
  it("chaque point déclare qui sait y répondre", () => {
    // Le mode n'est pas cosmétique : il décide si la voie déterministe exécute
    // le point, et si les constats du BAT ont le droit de le trancher. Un
    // reclassement silencieux casserait l'un ou l'autre.
    const par = partitionByMode(CONTROL_CHECKLIST);
    expect(par.deterministic).toHaveLength(16);
    expect(par.bat).toHaveLength(10);
    expect(par.llm).toHaveLength(9);
    expect(par.manual).toHaveLength(4);
  });

  it("ne laisse en « contrôle visuel » que ce qu'aucun code ne sait faire", () => {
    // Code-barres dessiné, cartouche Info-Tri absent du texte, Triman et Point
    // Vert qui sont des dessins : les quatre seuls que la mesure n'atteint pas.
    expect(partitionByMode(CONTROL_CHECKLIST).manual.map((c) => c.id).sort()).toEqual([
      "10.1",
      "12.1",
      "12.2",
      "13.4",
    ]);
  });

  it("aucun point déterministe ne rend un verdict vide", () => {
    // Un point déclaré « deterministic » passe par la voie A. S'il n'a pas
    // d'exécuteur, il en ressort sans justification — un verdict muet, qui a
    // l'air d'un contrôle fait. Les points conditionnels absents ici sont
    // simplement inapplicables à une fiche vide, ce qui est le cas nominal.
    for (const r of construireChecklist(FICHE_VIDE)) {
      if (r.mode !== "deterministic") continue;
      expect(r.justification, `point ${r.id} sans justification`).toBeTruthy();
    }
  });
});
