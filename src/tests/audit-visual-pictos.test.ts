import { describe, it, expect } from "vitest";
import { aggregate, buildPictoChecks, checksFromPresences, reconcile, type Presence } from "../lib/audit/visual/pictos";

const byId = (r: ReturnType<typeof buildPictoChecks>, id: string) => {
  const c = r.find((x) => x.id === id);
  if (!c) throw new Error(`check ${id} absent`);
  return c;
};

describe("Robot Visuel — jugement par code (perception → verdict)", () => {
  it("agrège la présence sur plusieurs faces : un PRESENT suffit", () => {
    expect(aggregate(["ABSENT", "PRESENT"])).toBe("PRESENT");
    expect(aggregate(["ABSENT", "ABSENT"])).toBe("ABSENT");
    expect(aggregate(["ABSENT", "INCERTAIN"])).toBe("INCERTAIN");
    expect(aggregate([])).toBe("INCERTAIN");
  });

  it("MT265 (facing + contre) : Eurofeuille/WFTO OK, Triman manquant, Point Vert bien absent", () => {
    const facing: Record<string, Presence> = {
      EUROFEUILLE: "PRESENT", WFTO: "PRESENT", TRIMAN: "ABSENT", INFO_TRI: "ABSENT", POINT_VERT: "ABSENT",
    };
    const contre: Record<string, Presence> = {
      EUROFEUILLE: "ABSENT", WFTO: "PRESENT", TRIMAN: "ABSENT", INFO_TRI: "ABSENT", POINT_VERT: "ABSENT",
    };
    const r = buildPictoChecks([facing, contre]);

    expect(byId(r, "VIS_EUROFEUILLE").statut).toBe("PASS"); // requis, présent ≥1 face
    expect(byId(r, "VIS_WFTO").statut).toBe("PASS");         // optionnel, présent
    expect(byId(r, "VIS_TRIMAN").statut).toBe("FAIL");       // requis, absent partout
    expect(byId(r, "VIS_INFO_TRI").statut).toBe("NA");       // optionnel, absent
    expect(byId(r, "VIS_POINT_VERT").statut).toBe("PASS");   // interdit, bien absent
  });

  it("logo interdit détecté → FAIL ; incertain → WARNING", () => {
    const r = buildPictoChecks([{ POINT_VERT: "PRESENT", EUROFEUILLE: "INCERTAIN" }]);
    expect(byId(r, "VIS_POINT_VERT").statut).toBe("FAIL");   // Point Vert présent = interdit
    expect(byId(r, "VIS_EUROFEUILLE").statut).toBe("WARNING"); // incertain
  });

  it("contre-examen : désaccord → INCERTAIN (on n'affirme pas le défaut)", () => {
    expect(reconcile("ABSENT", "ABSENT")).toBe("ABSENT");   // 2 avis concordants
    expect(reconcile("ABSENT", "PRESENT")).toBe("INCERTAIN"); // désaccord
    expect(reconcile("PRESENT", "INCERTAIN")).toBe("INCERTAIN");

    // 1re passe : Triman ABSENT → FAIL. Contre-examen : PRESENT → désaccord.
    const final: Record<string, Presence> = { TRIMAN: reconcile("ABSENT", "PRESENT") };
    const r = checksFromPresences(final);
    expect(byId(r, "VIS_TRIMAN").statut).toBe("WARNING"); // plus de FAIL : fausse alarme désamorcée
  });
});
