/**
 * Verse les résultats de l'audit BAT dans la liste de travail de Marie.
 *
 * Les deux audits ouvraient deux listes parallèles, avec deux vocabulaires et
 * aucun pont : elle pouvait obtenir un verdict Eurofeuille dans un onglet et
 * lire dans l'autre que le point 13.1 restait « à confirmer ». Deux réponses à
 * la même question, dans deux écrans.
 *
 * Le rattachement respecte la doctrine du projet — le modèle perçoit, le code
 * juge :
 *
 *   - un contrôle **de texte** est du code déterministe sur le PDF : il peut
 *     trancher le point ;
 *   - un contrôle **sémantique ou visuel** vient d'un modèle : il apporte une
 *     preuve datée et sourcée, la confirmation reste à la Qualité.
 *
 * Une non-conformité est une non-conformité quelle que soit son origine : un
 * FAIL remonte toujours en `CORRIGER`, parce qu'il désigne quelque chose à
 * regarder, jamais quelque chose à ignorer.
 */

import type { BatTextCheck } from "./visual/text-robot";
import { actionParDefaut, type ControlResult } from "./types";

export interface PreuveBat {
  libelle: string;
  statut: BatTextCheck["statut"];
  justification: string;
  origine: NonNullable<BatTextCheck["origine"]>;
}

const LIBELLE_ORIGINE: Record<PreuveBat["origine"], string> = {
  texte: "lecture du BAT",
  semantique: "analyse sémantique",
  visuel: "analyse visuelle",
};

/** Les preuves apportées par l'audit BAT, rangées par point de checklist. */
export function preuvesParPoint(checks: BatTextCheck[]): Record<string, PreuveBat[]> {
  const parPoint: Record<string, PreuveBat[]> = {};
  for (const c of checks) {
    if (!c.checklistId) continue;
    (parPoint[c.checklistId] ??= []).push({
      libelle: c.libelle,
      statut: c.statut,
      justification: c.justification,
      origine: c.origine ?? "texte",
    });
  }
  return parPoint;
}

/**
 * Réévalue un point à la lumière des preuves du BAT.
 *
 * Ne remplace jamais un verdict déterministe déjà rendu sur la fiche : les deux
 * répondent à des questions différentes — « la donnée est-elle correcte chez
 * nous » et « est-elle imprimée ». Le second complète le premier.
 */
export function appliquerPreuves(
  resultat: ControlResult,
  preuves: PreuveBat[] | undefined
): ControlResult {
  if (!preuves || preuves.length === 0) return resultat;

  const pire = preuves.some((p) => p.statut === "FAIL")
    ? "FAIL"
    : preuves.some((p) => p.statut === "WARNING")
      ? "WARNING"
      : "PASS";

  const detail = preuves
    .map((p) => `${LIBELLE_ORIGINE[p.origine]} : ${p.justification}`)
    .join(" ");

  // Une non-conformité prouvée sur le BAT prime, d'où qu'elle vienne.
  if (pire === "FAIL") {
    return { ...resultat, statut: "FAIL", action: "CORRIGER", justification: detail };
  }

  // Le point n'était pas exécuté (visuel ou LLM sans exécuteur) : le BAT y répond.
  if (resultat.mode !== "deterministic") {
    const surCode = preuves.every((p) => p.origine === "texte");
    if (pire === "PASS" && surCode) {
      // Du code a lu le BAT et a trouvé : le point est vérifié.
      return { ...resultat, statut: "PASS", action: "RIEN", justification: detail };
    }
    // Un modèle a donné son avis : il oriente le regard, il ne le remplace pas.
    return {
      ...resultat,
      statut: pire,
      action: "VERIFIER",
      justification: `${detail} — à confirmer sur le BAT.`,
    };
  }

  // Point déterministe déjà tranché sur la fiche : on ajoute la preuve BAT sans
  // écraser le verdict, et on ne redescend jamais l'action.
  const action = resultat.action ?? actionParDefaut(resultat.statut);
  return {
    ...resultat,
    justification: `${resultat.justification ?? ""} · ${detail}`.trim(),
    action,
  };
}

/** Applique toutes les preuves d'un audit BAT à une checklist. */
export function fusionner(
  checklist: ControlResult[],
  checks: BatTextCheck[]
): ControlResult[] {
  const preuves = preuvesParPoint(checks);
  return checklist.map((r) => appliquerPreuves(r, preuves[r.id]));
}
