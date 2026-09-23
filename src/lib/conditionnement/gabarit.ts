/**
 * Label templates recognised from a measured size. Orientation does not count
 * (a PDF may be portrait or landscape), and a millimetre either way is the
 * rounding of the trim box, not another template.
 */

export interface GabaritRef {
  id: string;
  petitCoteMm: number;
  grandCoteMm: number;
}

export const TOLERANCE_MM = 1;

export function reconnaitreGabarit(largeurMm: number, hauteurMm: number, gabarits: readonly GabaritRef[]): GabaritRef | null {
  const petit = Math.min(largeurMm, hauteurMm);
  const grand = Math.max(largeurMm, hauteurMm);
  return (
    gabarits.find(
      (g) => Math.abs(g.petitCoteMm - petit) <= TOLERANCE_MM && Math.abs(g.grandCoteMm - grand) <= TOLERANCE_MM,
    ) ?? null
  );
}
