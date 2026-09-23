import { describe, expect, it } from "vitest";
import { motifAbsenceBat } from "@/lib/conditionnement/absence-bat";

describe("motifAbsenceBat", () => {
  it("says a bulk bag printed in-house expects no file", () => {
    expect(motifAbsenceBat({ refFacing: null, refContre: null, format: "Vrac grand format (1,5 kg)", etiquetteGraphiste: false }))
      .toEqual({ type: "interne", format: "Vrac grand format (1,5 kg)" });
  });
  it("names the missing references when the sheet gives some", () => {
    expect(motifAbsenceBat({ refFacing: "ETBN4042V6", refContre: "ETCBN4042V6", format: "Détail grand", etiquetteGraphiste: true }))
      .toEqual({ type: "manquant", references: ["ETBN4042V6", "ETCBN4042V6"] });
  });
  it("admits it does not know otherwise", () => {
    expect(motifAbsenceBat({ refFacing: null, refContre: null, format: null, etiquetteGraphiste: null })).toEqual({ type: "inconnu" });
  });
});
