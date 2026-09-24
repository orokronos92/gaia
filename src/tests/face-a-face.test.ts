import { describe, expect, it } from "vitest";
import { controlerEurofeuille } from "../lib/audit/visual/eurofeuille";
import { mm } from "../lib/audit/visual/face-a-face";
import { fusionner } from "../lib/audit/fusion-bat";
import type { ControlResult } from "../lib/audit/types";

const logo = (largeurMm: number, hauteurMm: number) => ({ largeurMm, hauteurMm, x0: 0, y0: 0, x1: 10, y1: 10 });

describe("face-à-face mesuré / exigé (D2)", () => {
  it("écrit les millimètres à la française, sans arrondir un écart en conformité", () => {
    expect(mm(1.427)).toBe("1,427 mm");
    expect(mm(0.896)).toBe("0,896 mm");
    expect(mm(2)).toBe("2 mm");
  });

  it("Eurofeuille trop petite (TA6192) : une ligne mesuré / exigé", () => {
    const c = controlerEurofeuille([logo(12.78, 8.52)]);
    expect(c.statut).toBe("FAIL");
    expect(c.faceAFace?.lignes[0].gauche).toBe("12,78 × 8,52 mm");
    expect(c.faceAFace?.lignes[0].droite).toContain("≥ 13,5 × 9 mm");
  });

  it("Eurofeuille conforme : pas de tableau", () => {
    expect(controlerEurofeuille([logo(14, 9.3)]).faceAFace).toBeUndefined();
  });

  it("la fusion porte le tableau jusqu'à la carte", () => {
    const point: ControlResult = { id: "13.1", typeControle: "EUROFEUILLE", mode: "bat", statut: "WARNING", action: "VERIFIER", justification: "initial" };
    const [r] = fusionner([point], [controlerEurofeuille([logo(12.78, 8.52)])]);
    expect(r.statut).toBe("FAIL");
    expect(r.faceAFace?.lignes).toHaveLength(1);
  });
});
