import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import {
  controlerEurofeuille,
  mesurerEurofeuille,
  type MesureEurofeuille,
} from "../lib/audit/visual/eurofeuille";
import { lireTraces } from "../lib/utils/pdf-vecteurs";
import type { TraceVectoriel } from "../lib/utils/pdf-vecteurs";

const MM = 72 / 25.4;

const trace = (p: Partial<TraceVectoriel>): TraceVectoriel => ({
  sousTraces: 0,
  droites: 0,
  courbes: 0,
  rectangles: 0,
  x0: 0,
  y0: 0,
  x1: 0,
  y1: 0,
  ...p,
});

/** Le feuillage d'étoiles : 1 sous-tracé, 22 courbes, plus de 3 mm de large. */
const feuillage = (x = 10, y = 10, largeurMm = 5.3) =>
  trace({
    sousTraces: 1,
    courbes: 22,
    x0: x,
    y0: y,
    x1: x + largeurMm * MM,
    y1: y + largeurMm * 0.62 * MM,
  });

/** Le champ vert : un rectangle de proportions 1:1,5 qui englobe le feuillage. */
const champ = (largeurMm: number, x = 5, y = 5) =>
  trace({
    rectangles: 1,
    sousTraces: 1,
    x0: x,
    y0: y,
    x1: x + largeurMm * MM,
    y1: y + (largeurMm / 1.5) * MM,
  });

describe("reconnaissance de l'Eurofeuille au tracé", () => {
  it("mesure le champ vert qui englobe le feuillage", () => {
    const m = mesurerEurofeuille([champ(13.7), feuillage()]);
    expect(m?.largeurMm).toBeCloseTo(13.7, 1);
    expect(m?.hauteurMm).toBeCloseTo(9.13, 1);
  });

  it("ignore un rectangle englobant qui n'a pas les proportions du drapeau", () => {
    // Un fond de page englobe tout ; seul le ratio 1:1,5 désigne le champ vert.
    const fond = trace({ rectangles: 1, sousTraces: 1, x0: 0, y0: 0, x1: 500, y1: 900 });
    expect(mesurerEurofeuille([fond, feuillage()])).toBeNull();
  });

  it("retient le plus petit champ conforme, pas le premier venu", () => {
    const m = mesurerEurofeuille([champ(40), champ(13.7), feuillage()]);
    expect(m?.largeurMm).toBeCloseTo(13.7, 1);
  });

  it("ne reconnaît rien sans le feuillage", () => {
    expect(mesurerEurofeuille([champ(13.7)])).toBeNull();
  });

  it("écarte un fragment de même signature mais trop petit", () => {
    expect(mesurerEurofeuille([champ(2), feuillage(10, 10, 1)])).toBeNull();
  });
});

describe("verdict du point 13.1", () => {
  const mesure = (largeurMm: number): MesureEurofeuille => ({
    largeurMm,
    hauteurMm: Number((largeurMm / 1.5).toFixed(2)),
  });

  it("valide un logo au-dessus du minimum", () => {
    const c = controlerEurofeuille([mesure(13.7)]);
    expect(c.statut).toBe("PASS");
    expect(c.checklistId).toBe("13.1");
  });

  it("signale sans condamner un logo à la taille de la dérogation", () => {
    // Le manuel autorise 9 × 6 mm pour les « très petits emballages » sans
    // chiffrer « très petit » : le contrôle nomme la dérogation, il ne tranche pas.
    const c = controlerEurofeuille([mesure(12.78)]);
    expect(c.statut).toBe("WARNING");
    expect(c.justification).toContain("dérogation");
  });

  it("refuse un logo sous toute taille admise", () => {
    const c = controlerEurofeuille([mesure(8)]);
    expect(c.statut).toBe("FAIL");
  });

  it("retient la plus grande occurrence entre les faces", () => {
    expect(controlerEurofeuille([mesure(9.5), mesure(13.7)]).statut).toBe("PASS");
  });

  it("n'affirme jamais l'absence de ce qu'il n'a pas reconnu", () => {
    const c = controlerEurofeuille([null, null]);
    expect(c.statut).toBe("WARNING");
    expect(c.justification).toContain("ne prouve pas son absence");
  });
});

const CHEMIN = join(__dirname, "fixtures", "bat-ta7372-contre.pdf");
const siPresent = existsSync(CHEMIN) ? describe : describe.skip;

siPresent("tracés d'un BAT réel", () => {
  it("lit des tracés vectoriels sans jamais lever", () => {
    const traces = lireTraces(readFileSync(CHEMIN));
    expect(traces.length).toBeGreaterThan(0);
    for (const t of traces) {
      expect(t.x1).toBeGreaterThanOrEqual(t.x0);
      expect(t.y1).toBeGreaterThanOrEqual(t.y0);
    }
  });

  it("ne reconnaît pas l'Eurofeuille sur une contre-étiquette", () => {
    // Le logo vit sur la face avant, avec le code OC et l'origine (§11.1).
    expect(mesurerEurofeuille(lireTraces(readFileSync(CHEMIN)))).toBeNull();
  });
});
