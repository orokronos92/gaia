/**
 * Les décisions de la Qualité sur les points de la checklist.
 *
 * L'audit recalcule tout à chaque lancement. Sans mémoire, cocher une ligne ne
 * survivrait pas au rafraîchissement suivant — et une checklist qu'on ne peut
 * pas cocher n'est pas une liste de travail, c'est un rapport.
 *
 * Le point délicat n'est pas de mémoriser, c'est de **savoir quand oublier**.
 * Si Marie valide « hauteur de x conforme » puis que Fabrice envoie un autre
 * BAT, la coche doit se rouvrir : sinon l'application certifie quelque chose
 * qu'elle n'a jamais regardé.
 *
 * D'où l'empreinte. Une décision est attachée **au constat qu'elle répondait** —
 * statut et justification du contrôle au moment où elle a été prise. Tant que
 * le contrôle dit la même chose, la décision tient ; dès qu'il dit autre chose,
 * la ligne se rouvre en le disant. C'est plus juste que de tout rouvrir au
 * moindre changement de fiche : Marie modifie justement la fiche parce que
 * l'audit le lui a demandé, et perdre ses dix coches à chaque correction la
 * ferait cesser d'en poser.
 */

import { createHash } from "crypto";

import type { ControlResult } from "./types";

export const DECISIONS = ["VERIFIE", "DEROGATION"] as const;
export type Decision = (typeof DECISIONS)[number];

export interface ValidationControle {
  pointId: string;
  decision: Decision;
  justification: string | null;
  empreinte: string;
  valideParNom: string;
  valideLe: Date;
}

/** Ce que la décision a validé : le constat, pas la ligne. */
export function empreinteConstat(resultat: ControlResult): string {
  return createHash("sha256")
    .update(`${resultat.statut}|${resultat.justification ?? ""}`)
    .digest("hex")
    .slice(0, 64);
}

/** L'état d'une décision face au constat courant. */
export interface EtatValidation {
  decision: Decision;
  parNom: string;
  le: Date;
  justification: string | null;
  /** Vrai si le contrôle ne dit plus ce qu'elle avait validé. */
  perimee: boolean;
}

/**
 * Applique une décision à un point.
 *
 * Une décision périmée ne referme rien : la ligne reste à traiter, mais porte
 * la trace de la validation précédente pour que Marie sache qu'elle a déjà
 * regardé, et sur quoi.
 */
export function appliquerValidation(
  resultat: ControlResult,
  validation: ValidationControle | undefined
): ControlResult {
  if (!validation) return resultat;

  const perimee = validation.empreinte !== empreinteConstat(resultat);
  const etat: EtatValidation = {
    decision: validation.decision,
    parNom: validation.valideParNom,
    le: validation.valideLe,
    justification: validation.justification,
    perimee,
  };

  if (perimee) return { ...resultat, validation: etat };

  // La décision close le point : le statut reste ce que la mesure a trouvé — on
  // ne réécrit pas l'histoire —, mais il n'y a plus rien à faire dessus.
  return { ...resultat, action: "RIEN", validation: etat };
}

/** Applique les décisions de la Qualité à toute une checklist. */
export function appliquerValidations(
  resultats: ControlResult[],
  validations: ValidationControle[]
): ControlResult[] {
  const parPoint = new Map(validations.map((v) => [v.pointId, v]));
  return resultats.map((r) => appliquerValidation(r, parPoint.get(r.id)));
}

/**
 * Une décision est-elle recevable ?
 *
 * Passer outre une non-conformité prouvée n'est pas cocher une alerte : la
 * justification devient obligatoire, parce qu'une dérogation assumée doit
 * rester lisible plutôt que de disparaître dans du vert.
 */
export function refusMotif(
  decision: Decision,
  statut: ControlResult["statut"],
  justification: string | null
): string | null {
  if (decision === "DEROGATION" && !justification?.trim()) {
    return "Une dérogation demande un motif écrit.";
  }
  if (decision === "VERIFIE" && statut === "FAIL") {
    return "Ce point est en non-conformité prouvée : il se lève par une dérogation motivée, pas par une simple vérification.";
  }
  return null;
}
