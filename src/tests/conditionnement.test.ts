import { describe, expect, it } from "vitest";
import { chiffreDeFormat } from "@/lib/conditionnement/format-vente";
import { reconnaitreGabarit } from "@/lib/conditionnement/gabarit";
import { lireMesurePdf } from "@/lib/conditionnement/mesure-pdf";

describe("chiffreDeFormat", () => {
  it("reads the packaging digit after the family letters", () => {
    expect(["TB4041", "TB4042", "TB4046", "TUTJ0746"].map(chiffreDeFormat)).toEqual(["1", "2", "6", "6"]);
  });
  it("returns null for codes without one, and for brick variants", () => {
    expect(["TH505", "MT265", "COF1203", "pétales"].map(chiffreDeFormat)).toEqual([null, null, null, null]);
  });
});

describe("reconnaitreGabarit", () => {
  const gabarits = [{ id: "facing", petitCoteMm: 55, grandCoteMm: 135 }, { id: "contre", petitCoteMm: 55, grandCoteMm: 95 }];
  it("ignores orientation and a millimetre of rounding", () => {
    expect(reconnaitreGabarit(136, 55, gabarits)?.id).toBe("facing");
    expect(reconnaitreGabarit(54, 96, gabarits)?.id).toBe("contre");
  });
  it("does not stretch a template to an unknown size", () => {
    expect(reconnaitreGabarit(70, 277, gabarits)).toBeNull();
  });
});

describe("lireMesurePdf", () => {
  it("prefers the trim box, which is the printed label", () => {
    const sortie = "MediaBox:  0.00 0.00 226.77 425.20\nTrimBox:  28.35 28.35 184.25 411.02\n";
    expect(lireMesurePdf(sortie)).toEqual({ largeurMm: 55, hauteurMm: 135, source: "TRIM" });
  });
  it("falls back to the page when the trim box is missing or equal to it", () => {
    const sortie = "MediaBox:  0.00 0.00 133.23 181.42\nTrimBox:  0.00 0.00 133.23 181.42\n";
    expect(lireMesurePdf(sortie)).toEqual({ largeurMm: 47, hauteurMm: 64, source: "MEDIA" });
  });
});
