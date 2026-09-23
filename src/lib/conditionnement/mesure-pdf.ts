/**
 * Reads the label size out of `pdfinfo -box` output. The trim box is the
 * printed label; files without one (A3 sheets, some stickers) fall back to the
 * media box, flagged as such so nobody mistakes a page for a label.
 */

export interface MesurePdf {
  largeurMm: number;
  hauteurMm: number;
  source: "TRIM" | "MEDIA";
}

const POINTS_PAR_MM = 72 / 25.4;

function boite(sortie: string, nom: string): [number, number, number, number] | null {
  const match = sortie.match(new RegExp(`${nom}:\\s+([\\d.-]+)\\s+([\\d.-]+)\\s+([\\d.-]+)\\s+([\\d.-]+)`));
  return match ? [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])] : null;
}

export function lireMesurePdf(sortiePdfinfo: string): MesurePdf | null {
  const media = boite(sortiePdfinfo, "MediaBox");
  const trim = boite(sortiePdfinfo, "TrimBox");
  const distincte = trim !== null && (media === null || trim.some((v, i) => v !== media[i]));
  const retenue = distincte ? trim : media;
  if (retenue === null) return null;
  const [x0, y0, x1, y1] = retenue;
  return {
    largeurMm: Math.round((x1 - x0) / POINTS_PAR_MM),
    hauteurMm: Math.round((y1 - y0) / POINTS_PAR_MM),
    source: distincte ? "TRIM" : "MEDIA",
  };
}
