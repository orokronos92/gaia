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
  manqueSurLaFiche?: string;
  proposition?: BatTextCheck["proposition"];
  reperes?: BatTextCheck["reperes"];
}

const LIBELLE_ORIGINE: Record<PreuveBat["origine"], string> = {
  texte: "lecture du BAT",
  semantique: "analyse sémantique",
  visuel: "analyse visuelle",
};

const libelleOrigine = (origine: string) =>
  LIBELLE_ORIGINE[origine as PreuveBat["origine"]] ?? "constat du BAT";

/** Deux preuves sont la même quand elles disent la même chose, de la même source. */
const empreintePreuve = (p: { origine: string; libelle: string; justification: string }) =>
  `${p.origine}|${p.libelle}|${p.justification}`;

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
      manqueSurLaFiche: c.manqueSurLaFiche,
      proposition: c.proposition,
      reperes: c.reperes,
    });
  }
  return parPoint;
}

/**
 * Réévalue un point à la lumière de TOUTES les preuves connues du BAT.
 *
 * Les preuves s'accumulent, elles ne se remplacent pas. L'écran fusionne en deux
 * temps — les constats mesurés d'abord, ceux du modèle quand Marie lance
 * l'analyse — et la seconde passe réévaluait le point sur les seules preuves du
 * modèle. Sur TA737, l'Eurofeuille mesurée à 12,78 × 8,52 mm, sous la taille
 * minimale, redevenait « à vérifier » parce que le modèle avait répondu « logo
 * détecté ». Les deux ont raison : l'un dit qu'il est là, l'autre qu'il est trop
 * petit. Ce sont deux réponses à deux questions, et Marie doit lire les deux.
 *
 * D'où la mémoire : le point garde son `socle` — ce que la fiche seule disait —
 * et la liste des preuves reçues. Chaque fusion réévalue depuis cet ensemble,
 * ce qui la rend rejouable et indifférente à l'ordre des clics.
 *
 * La règle de fond ne bouge pas : **une mesure ne se fait pas contredire par un
 * avis**. Un FAIL l'emporte d'où qu'il vienne, et le modèle seul ne clôt jamais
 * un point. Marie garde le dernier mot, par dérogation assumée si elle juge que
 * l'écart passe.
 */
export function appliquerPreuves(
  resultatInitial: ControlResult,
  preuvesNouvelles: PreuveBat[] | undefined
): ControlResult {
  const socle = resultatInitial.socle ?? {
    statut: resultatInitial.statut,
    action: resultatInitial.action,
    justification: resultatInitial.justification,
  };

  const connues = resultatInitial.preuves ?? [];
  const vues = new Set(connues.map(empreintePreuve));
  const ajoutees = (preuvesNouvelles ?? []).filter((p) => !vues.has(empreintePreuve(p)));
  if (connues.length === 0 && ajoutees.length === 0) return resultatInitial;

  const preuves: PreuveBat[] = [...(connues as PreuveBat[]), ...ajoutees];

  let resultat: ControlResult = {
    ...resultatInitial,
    socle,
    preuves: preuves.map((p) => ({
      libelle: p.libelle,
      statut: p.statut,
      justification: p.justification,
      origine: p.origine,
      manqueSurLaFiche: p.manqueSurLaFiche,
    })),
    statut: socle.statut,
    action: socle.action,
    justification: socle.justification,
  };

  // Un point que la Qualité a tranché reste tranché : la preuve vient s'ajouter
  // à la ligne, elle ne rouvre pas la décision. C'est l'empreinte du constat,
  // calculée côté serveur, qui décide de la péremption — pas l'arrivée d'un
  // élément supplémentaire à l'écran.
  const dejaTranche = resultat.validation && !resultat.validation.perimee;

  const pire = preuves.some((p) => p.statut === "FAIL")
    ? "FAIL"
    : preuves.some((p) => p.statut === "WARNING")
      ? "WARNING"
      : "PASS";

  // Chaque preuve garde sa voix : Marie lit « le logo est là » ET « il est trop
  // petit ». Fondre les deux en une phrase ferait disparaître l'une des deux.
  const detail = preuves
    .map((p) => `${libelleOrigine(p.origine)} : ${p.justification}`)
    .join(" · ");

  // Ce que le BAT propose d'enregistrer suit le point, quel que soit son verdict.
  const proposition = (preuvesNouvelles ?? []).find((p) => p.proposition)?.proposition;
  if (proposition) resultat = { ...resultat, proposition };

  // Les repères de toutes les preuves du point se cumulent : un contrôle de
  // position en désigne deux ou trois, et Marie doit les voir ensemble.
  const reperes = [
    ...(resultatInitial.reperes ?? []),
    ...(preuvesNouvelles ?? []).flatMap((p) => p.reperes ?? []),
  ];
  if (reperes.length > 0) resultat = { ...resultat, reperes };

  if (dejaTranche) {
    return {
      ...resultat,
      justification: `${socle.justification ?? ""} · ${detail}`.trim(),
      action: "RIEN",
    };
  }

  // Une non-conformité prouvée sur le BAT prime, d'où qu'elle vienne.
  if (pire === "FAIL") {
    return { ...resultat, statut: "FAIL", action: "CORRIGER", justification: detail };
  }

  // Le point n'était pas exécuté (visuel ou LLM sans exécuteur) : le BAT y répond.
  if (resultat.mode !== "deterministic") {
    const surCode = preuves.every((p) => p.origine === "texte");
    if (surCode) {
      // Du code a lu ou mesuré le BAT. S'il conclut, le point est vérifié ; s'il
      // laisse une réserve, elle dit déjà d'elle-même ce qu'il reste à regarder —
      // y ajouter « à confirmer sur le BAT » laisserait croire à un avis de modèle.
      // Rien à vérifier tant que la fiche est muette : ce qu'on attend d'elle,
      // c'est d'être complétée. Le décompte de tête d'écran doit le dire.
      const aCompleter = preuves.some((p) => p.manqueSurLaFiche);
      return pire === "PASS"
        ? { ...resultat, statut: "PASS", action: "RIEN", justification: detail }
        : { ...resultat, statut: pire, action: aCompleter ? "COMPLETER" : "VERIFIER", justification: detail };
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
  const action = socle.action ?? actionParDefaut(socle.statut);
  return {
    ...resultat,
    justification: `${socle.justification ?? ""} · ${detail}`.trim(),
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
