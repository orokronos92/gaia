/**
 * What the fiche says when a product shows no BAT. "Aucun BAT" alone reads as
 * a bug; the data usually knows why (Opus's warning of 2026-09-23: Marie would
 * report the gaps as bugs):
 * - a bulk format printed in-house expects no file from the Graphics team;
 * - a product whose sheet names label references is missing a file;
 * - otherwise nothing tells what to expect.
 */

export interface ContexteAbsenceBat {
  refFacing: string | null;
  refContre: string | null;
  /** Sales format label ("Vrac grand format (1,5 kg)"), null when the code carries none. */
  format: string | null;
  /** False for bulk formats: their label is printed in-house. */
  etiquetteGraphiste: boolean | null;
}

export type AbsenceBat =
  | { type: "interne"; format: string }
  | { type: "manquant"; references: string[] }
  | { type: "inconnu" };

export function motifAbsenceBat(contexte: ContexteAbsenceBat): AbsenceBat {
  const references = [contexte.refFacing, contexte.refContre].filter((r): r is string => r !== null);
  if (references.length > 0) return { type: "manquant", references };
  if (contexte.etiquetteGraphiste === false && contexte.format) return { type: "interne", format: contexte.format };
  return { type: "inconnu" };
}
