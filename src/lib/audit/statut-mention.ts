/**
 * L'état d'une mention de gamme, et qui en décide.
 *
 * Les contrôles de mention se déclenchaient sur la gamme du produit, lue en
 * base et jamais discutable : la Qualité recevait un constat dont elle ne
 * pouvait corriger que la ligne, jamais la cause. Elle pouvait déroger, ce qui
 * referme le point et le rouvre au contrôle suivant — un geste à refaire à
 * chaque fois, sur une décision déjà prise.
 *
 * Trois positions, et la décision tient. `AUTO` déduit ; `OUI` et `NON` sont sa
 * parole, et sa parole prime sur la donnée. La base n'est qu'un échantillon de
 * ce que JDG imprime : c'est elle qui fait foi, pas la colonne.
 *
 * Module pur, sans base ni requête — lu par la voie déterministe comme par le
 * robot de texte, qui doivent trancher pareil.
 */

import { normalize } from "./canonical";

export type StatutMention = "AUTO" | "OUI" | "NON";

/**
 * La mention est-elle due ?
 *
 * `deduit` est ce que la donnée laisse penser — la gamme du produit, un
 * ingrédient Demeter dans la recette. Il ne sert qu'en `AUTO`.
 */
export function mentionDue(
  statut: StatutMention | null | undefined,
  deduit: boolean
): boolean {
  if (statut === "NON") return false;
  if (statut === "OUI") return true;
  return deduit;
}

/**
 * La gamme porte-t-elle ce motif ?
 *
 * On cherche un fragment, jamais l'intitulé complet : la base écrit « LES
 * ENGAGÉS » et « Les Militants » avec des casses qui ne s'accordent pas, et
 * « THE TRANSPORTE A LA VOILE » sans aucun accent.
 */
export function gammePorte(gamme: string | null | undefined, motif: string): boolean {
  return normalize(gamme ?? "").includes(motif);
}

/** Gamme « THÉ TRANSPORTÉ À LA VOILE » — 3 références au catalogue. */
export const estGammeAnemos = (gamme?: string | null): boolean => gammePorte(gamme, "voile");

/** Gamme « LES ENGAGÉS » — 11 références, 3 sous-gammes. */
export const estGammeEngages = (gamme?: string | null): boolean => gammePorte(gamme, "engag");

/**
 * Une phrase de mention est-elle SAISIE ?
 *
 * Sert de déduction pour WFTO, dont le champ est tenu depuis l'Excel — 96 fiches
 * portent la phrase JDG au mot près. La convention « / » qui y disait « non
 * concerné » a été traduite en `statut = NON` par la migration 0018 ; le test
 * la tolère encore pour les saisies faites à la main avant que l'écran n'offre
 * le choix.
 */
export function phraseSaisie(phrase?: string | null): boolean {
  return !/^[\s/–—-]*$/.test(phrase ?? "");
}
