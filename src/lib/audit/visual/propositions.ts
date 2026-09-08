/**
 * Ce que le BAT sait et que la fiche ignore.
 *
 * Le poids net est imprimé sur l'étiquette et absent de la fiche : l'audit dit
 * « donnée absente », et Marie doit aller la retaper. L'application peut faire
 * mieux — mais **pas la recopier toute seule**.
 *
 * PRO-QHS-013 repose sur un sens de lecture unique : la fiche est la référence,
 * le BAT doit s'y conformer. Si l'application remplit la fiche depuis
 * l'étiquette puis compare les deux, le contrôle devient circulaire — il passera
 * toujours, puisque la valeur vient de ce qu'il est censé vérifier.
 *
 * Elle propose donc, en un clic, et c'est la Qualité qui enregistre. Le geste
 * reste le sien, daté et signé ; on lui épargne seulement la saisie.
 */

import { normCmp, pagesDeMots } from "./mesure-mentions";
import type { BatTextCheck } from "./text-robot";
import type { AnalyseBat } from "@/lib/utils/pdf-bat";

/** Une valeur lue sur le BAT, proposée à l'enregistrement. */
export interface Proposition {
  /** Champ visé, tel que la liste blanche du produit le nomme. */
  champ: "poidsNet";
  valeur: string;
  /** D'où elle vient — Marie doit pouvoir vérifier avant de cliquer. */
  source: string;
}

/** Une masse imprimée : « 100g », « 1,5 kg ». */
const MASSE = /^(\d+(?:[.,]\d+)?)\s*(kg|g)$/;

function commeMasse(texte: string): string | null {
  const m = MASSE.exec(normCmp(texte).replace(/\s+/g, ""));
  if (!m) return null;
  return `${m[1].replace(".", ",")} ${m[2]}`;
}

/**
 * Le poids net imprimé, s'il ne fait aucun doute.
 *
 * On exige la séquence complète « poids net <masse> » : un nombre suivi de « g »
 * traîne partout sur une étiquette de thé — un grammage d'arôme, une dose par
 * tasse. Proposer la mauvaise valeur serait pire que de ne rien proposer, parce
 * qu'elle serait enregistrée d'un clic.
 *
 * Deux valeurs différentes trouvées : on ne propose rien et on le dit.
 */
export function proposerPoidsNet(analyses: AnalyseBat[]): Proposition | null {
  const trouvees = new Set<string>();

  for (const mots of pagesDeMots(analyses)) {
    for (let i = 0; i + 2 < mots.length; i++) {
      if (normCmp(mots[i].texte) !== "poids") continue;
      if (normCmp(mots[i + 1].texte) !== "net") continue;
      const masse = commeMasse(mots[i + 2].texte);
      if (masse) trouvees.add(masse);
    }
  }

  if (trouvees.size !== 1) return null;
  const valeur = [...trouvees][0];
  return { champ: "poidsNet", valeur, source: `lu sur le BAT : « poids net ${valeur} »` };
}

/**
 * Le constat que Marie doit lire quand la fiche est muette et l'étiquette non.
 *
 * Émis seulement si la fiche ne porte pas déjà la donnée : quand elle la porte,
 * c'est la comparaison BAT ↔ fiche qui a du sens, pas une proposition.
 */
export function controlerPropositions(
  analyses: AnalyseBat[],
  entree: { poidsNet?: string | null }
): BatTextCheck[] {
  if (entree.poidsNet?.trim()) return [];

  const proposition = proposerPoidsNet(analyses);
  if (!proposition) return [];

  return [
    {
      id: "PROP_POIDS_NET",
      origine: "texte",
      rubrique: "Quantité nette",
      libelle: "Quantité nette absente de la fiche",
      statut: "WARNING",
      justification: `La fiche ne porte pas de quantité nette, mais le BAT l'imprime — ${proposition.source}. À enregistrer sur la fiche, qui reste la référence.`,
      checklistId: "6.1",
      proposition,
    },
  ];
}
