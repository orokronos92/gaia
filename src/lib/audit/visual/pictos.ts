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
/**
 * - REQUIS / INTERDIT / OPTIONNEL : the regulatory expectation.
 * - A_EVITER : allowed by law, but JDG does not put it forward on its finished
 *   products (PRO-QHS-313 v2 §11.2 — MH and FFL, except bags and trading).
 * - ANNEE_EN_COURS : allowed only for the current year (Meilleur produit Bio).
 * The last two say nothing when the logo is absent: the catalogue carries none
 * today, and a control that only watches for them must not add a line to every
 * card.
 */
type Attendu = "REQUIS" | "INTERDIT" | "OPTIONNEL" | "A_EVITER" | "ANNEE_EN_COURS";

export interface PictoDef {
  cle: string;
  /** Point de la checklist auquel ce logo répond (PRO-QHS-313). */
  checklistId: string;
  /** Visual description handed to the model so it knows what to look for. */
  desc: string;
  rubrique: string;
  libelle: string;
  attendu: Attendu;
  /** The model also reads the year printed on the logo. */
  lireAnnee?: boolean;
}

/** Logos the visual robot inspects on the BAT. */
export const PICTOS_A_DETECTER: PictoDef[] = [
  { cle: "EUROFEUILLE", checklistId: "13.1", desc: "Eurofeuille (feuille verte composée d'étoiles, logo bio UE)", rubrique: "Labels", libelle: "Eurofeuille présente sur le BAT ?", attendu: "REQUIS" },
  { cle: "TRIMAN", checklistId: "12.1", desc: "Triman (silhouette stylisée avec trois flèches, logo de tri)", rubrique: "Pictogrammes", libelle: "Triman présent sur le BAT ?", attendu: "REQUIS" },
  { cle: "INFO_TRI", checklistId: "12.2", desc: "cartouche Info-Tri (consignes de tri détaillées en bloc)", rubrique: "Pictogrammes", libelle: "Info-Tri présent sur le BAT ?", attendu: "OPTIONNEL" },
  { cle: "POINT_VERT", checklistId: "13.4", desc: "Point Vert (deux flèches vertes enlacées formant un cercle)", rubrique: "Labels", libelle: "Point Vert bien absent du BAT (interdit) ?", attendu: "INTERDIT" },
  { cle: "WFTO", checklistId: "13.3", desc: "logo WFTO (World Fair Trade Organization)", rubrique: "Labels", libelle: "Logo WFTO présent sur le BAT ?", attendu: "OPTIONNEL" },
  // PRO-QHS-313 v2 §11.2 (2026-09-24).
  { cle: "MAX_HAVELAAR", checklistId: "13.3", desc: "logo Fairtrade / Max Havelaar (personnage stylisé noir, bleu et vert, mention FAIRTRADE MAX HAVELAAR)", rubrique: "Labels", libelle: "Logo Max Havelaar non mis en avant (produits finis JDG) ?", attendu: "A_EVITER" },
  { cle: "FAIR_FOR_LIFE", checklistId: "13.3", desc: "logo Fair for Life (texte « fair for life » blanc sur fond orange)", rubrique: "Labels", libelle: "Logo Fair for Life non mis en avant (produits finis JDG) ?", attendu: "A_EVITER" },
  { cle: "MEILLEUR_BIO", checklistId: "13.3", desc: "logo Meilleur produit Bio (médaille dorée « MEILLEUR BIO » portant une année)", rubrique: "Labels", libelle: "Logo Meilleur produit Bio de l'année en cours ?", attendu: "ANNEE_EN_COURS", lireAnnee: true },
];

/** Year printed on dated logos, when the model could read it. */
export type Annees = Record<string, number | null>;

/** Aggregate a logo's presence across faces: any PRESENT wins; all ABSENT → ABSENT; else INCERTAIN. */
export function aggregate(presences: Presence[]): Presence {
  if (presences.includes("PRESENT")) return "PRESENT";
  if (presences.length > 0 && presences.every((p) => p === "ABSENT")) return "ABSENT";
  return "INCERTAIN";
}

function verdict(
  attendu: Attendu,
  p: Presence,
  annee: number | null,
  anneeCourante: number
): { statut: ControlStatus; justification: string } | null {
  // Watched-for logos speak only when they are there.
  if ((attendu === "A_EVITER" || attendu === "ANNEE_EN_COURS") && p !== "PRESENT") return null;
  if (attendu === "A_EVITER") {
    return {
      statut: "WARNING",
      justification:
        "Logo détecté : il n'est pas mis en avant sur les produits finis JDG, hors poches et négoce (PRO-QHS-313 §11.2) — à vérifier.",
    };
  }
  if (attendu === "ANNEE_EN_COURS") {
    if (annee === null) {
      return { statut: "WARNING", justification: `Logo détecté, année non lue : il n'est autorisé que pour l'année en cours (${anneeCourante}).` };
    }
    return annee === anneeCourante
      ? { statut: "PASS", justification: `Logo ${annee} : année en cours.` }
      : { statut: "FAIL", justification: `Logo ${annee} : autorisé uniquement pour l'année en cours (${anneeCourante}) — PRO-QHS-313 §11.2.` };
  }
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
export function checksFromPresences(
  presences: Record<string, Presence>,
  annees: Annees = {},
  anneeCourante: number = new Date().getFullYear()
): BatTextCheck[] {
  return PICTOS_A_DETECTER.flatMap((def) => {
    const v = verdict(def.attendu, presences[def.cle] ?? "INCERTAIN", annees[def.cle] ?? null, anneeCourante);
    if (v === null) return [];
    return [{
      id: `VIS_${def.cle}`,
      checklistId: def.checklistId,
      origine: "visuel",
      rubrique: def.rubrique,
      libelle: def.libelle,
      statut: v.statut,
      justification: v.justification,
    } satisfies BatTextCheck];
  });
}

/** Maps per-face detections to verdicts (one BatTextCheck per logo). */
export function buildPictoChecks(detections: Record<string, Presence>[]): BatTextCheck[] {
  return checksFromPresences(aggregateAll(detections));
}
