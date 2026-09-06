/**
 * Visual audit — picto rules (pure layer).
 *
 * The vision model only PERCEIVES (present / absent / uncertain); the verdict is
 * decided here by code, from the regulatory expectation of each logo. Same
 * split as the rest of the audit: the LLM never judges conformity, code does.
 *
 * Validated empirically on MT265 via document_url (no PDF→PNG conversion):
 * the vision model reads the artwork natively and reports each logo reliably.
 */

import type { ControlStatus } from "../types";
import type { BatTextCheck } from "./text-robot";

export type Presence = "PRESENT" | "ABSENT" | "INCERTAIN";
type Attendu = "REQUIS" | "INTERDIT" | "OPTIONNEL";

export interface PictoDef {
  cle: string;
  /** Visual description handed to the model so it knows what to look for. */
  desc: string;
  rubrique: string;
  libelle: string;
  attendu: Attendu;
}

/** Logos the visual robot inspects on the BAT. */
export const PICTOS_A_DETECTER: PictoDef[] = [
  { cle: "EUROFEUILLE", desc: "Eurofeuille (feuille verte composée d'étoiles, logo bio UE)", rubrique: "Labels", libelle: "Eurofeuille présente sur le BAT ?", attendu: "REQUIS" },
  { cle: "TRIMAN", desc: "Triman (silhouette stylisée avec trois flèches, logo de tri)", rubrique: "Pictogrammes", libelle: "Triman présent sur le BAT ?", attendu: "REQUIS" },
  { cle: "INFO_TRI", desc: "cartouche Info-Tri (consignes de tri détaillées en bloc)", rubrique: "Pictogrammes", libelle: "Info-Tri présent sur le BAT ?", attendu: "OPTIONNEL" },
  { cle: "POINT_VERT", desc: "Point Vert (deux flèches vertes enlacées formant un cercle)", rubrique: "Labels", libelle: "Point Vert bien absent du BAT (interdit) ?", attendu: "INTERDIT" },
  { cle: "WFTO", desc: "logo WFTO (World Fair Trade Organization)", rubrique: "Labels", libelle: "Logo WFTO présent sur le BAT ?", attendu: "OPTIONNEL" },
];

/** Aggregate a logo's presence across faces: any PRESENT wins; all ABSENT → ABSENT; else INCERTAIN. */
export function aggregate(presences: Presence[]): Presence {
  if (presences.includes("PRESENT")) return "PRESENT";
  if (presences.length > 0 && presences.every((p) => p === "ABSENT")) return "ABSENT";
  return "INCERTAIN";
}

function verdict(attendu: Attendu, p: Presence): { statut: ControlStatus; justification: string } {
  if (p === "INCERTAIN") {
    return { statut: "WARNING", justification: "Présence incertaine à l'analyse visuelle — à confirmer sur le BAT." };
  }
  if (attendu === "REQUIS") {
    return p === "PRESENT"
      ? { statut: "PASS", justification: "Logo obligatoire détecté sur le BAT." }
      : { statut: "FAIL", justification: "Logo obligatoire non détecté sur le BAT." };
  }
  if (attendu === "INTERDIT") {
    return p === "ABSENT"
      ? { statut: "PASS", justification: "Logo interdit bien absent du BAT." }
      : { statut: "FAIL", justification: "Logo interdit détecté sur le BAT." };
  }
  return p === "PRESENT"
    ? { statut: "PASS", justification: "Présent sur le BAT." }
    : { statut: "NA", justification: "Non présent (facultatif)." };
}

/** Aggregates per-face detections into one presence per logo. */
export function aggregateAll(detections: Record<string, Presence>[]): Record<string, Presence> {
  const out: Record<string, Presence> = {};
  for (const def of PICTOS_A_DETECTER) {
    out[def.cle] = aggregate(detections.map((d) => d[def.cle]).filter(Boolean) as Presence[]);
  }
  return out;
}

/**
 * Reconcile two independent reads of the same logo (initial + adversarial
 * counter-exam). Agreement keeps the verdict; disagreement → INCERTAIN, so a
 * contested FAIL is never asserted on a split opinion — it degrades to WARNING.
 */
export function reconcile(p1: Presence, p2: Presence): Presence {
  return p1 === p2 ? p1 : "INCERTAIN";
}

/** Builds the verdict checks from a final presence per logo. */
export function checksFromPresences(presences: Record<string, Presence>): BatTextCheck[] {
  return PICTOS_A_DETECTER.map((def) => {
    const v = verdict(def.attendu, presences[def.cle] ?? "INCERTAIN");
    return { id: `VIS_${def.cle}`, rubrique: def.rubrique, libelle: def.libelle, statut: v.statut, justification: v.justification };
  });
}

/** Maps per-face detections to verdicts (one BatTextCheck per logo). */
export function buildPictoChecks(detections: Record<string, Presence>[]): BatTextCheck[] {
  return checksFromPresences(aggregateAll(detections));
}
