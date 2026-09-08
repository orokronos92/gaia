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

import { facesBat, normCmp } from "./mesure-mentions";
import { repereMot, type RepereBat } from "./reperes";
import type { BatTextCheck } from "./text-robot";
import type { AnalyseBat } from "@/lib/utils/pdf-bat";

/** Une valeur lue sur le BAT, proposée à l'enregistrement. */
export interface Proposition {
  /**
   * Où la valeur s'écrit. Le poids net appartient au produit — le changer
   * change toutes ses fiches ; le code étiquette appartient à la fiche, et
   * c'est bien ce qu'on veut : deux conditionnements d'un même thé ne portent
   * pas le même code.
   */
  table: "produit" | "fiche";
  /** Champ visé, tel que la liste blanche de sa table le nomme. */
  champ: "poidsNet" | "codeEtiquette";
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
 * Un code étiquette imprimé : `ETCRA2372V6`, `ETTUTO3542`, `ETHN4400V6`.
 *
 * La forme vient du catalogue, pas d'une intuition : `ET`, la famille en
 * lettres, le numéro d'article, et la version quand elle est portée. Elle est
 * assez typée pour qu'aucun autre mot d'une étiquette ne lui ressemble — un
 * balayage des 290 BAT du catalogue n'en a sorti que des codes.
 */
const CODE_ETIQUETTE = /^ET[A-Z]{2,6}\d{3,5}(?:V\d{1,2})?$/;

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
export function proposerPoidsNet(
  analyses: AnalyseBat[]
): (Proposition & { reperes: RepereBat[] }) | null {
  const trouvees = new Set<string>();
  const reperes: RepereBat[] = [];

  for (const [face, page] of facesBat(analyses).entries()) {
    const mots = page.mots;
    for (let i = 0; i + 2 < mots.length; i++) {
      if (normCmp(mots[i].texte) !== "poids") continue;
      if (normCmp(mots[i + 1].texte) !== "net") continue;
      const masse = commeMasse(mots[i + 2].texte);
      if (!masse) continue;
      trouvees.add(masse);
      reperes.push(repereMot(mots[i + 2], page, face, `Poids net ${masse}`));
    }
  }

  if (trouvees.size !== 1) return null;
  const valeur = [...trouvees][0];
  return {
    table: "produit",
    champ: "poidsNet",
    valeur,
    source: `lu sur le BAT : « poids net ${valeur} »`,
    reperes,
  };
}

/** Ce que la lecture des codes imprimés a donné, y compris quand elle échoue. */
type LectureCode =
  | { propose: Proposition & { reperes: RepereBat[] } }
  | { propose: null; motif: string };

/**
 * Le code étiquette imprimé, s'il n'y en a qu'un.
 *
 * Mesuré sur les 146 produits qui ont des BAT : 95 n'en impriment qu'un — c'est
 * le code de la contre-étiquette dans 78 cas, celui de la face unique dans les
 * autres, et c'est bien celui que le point 15.1 demande. Restent 41 produits
 * dont les BAT sont entièrement vectorisés (aucun mot à lire) et 10 dont le
 * dossier couvre plusieurs conditionnements, donc plusieurs codes.
 *
 * Dans ces deux derniers cas on ne propose rien. Le nom du fichier porte bien
 * un code, mais c'est une métadonnée de rangement, pas la mention imprimée que
 * le contrôle vise — et sur un dossier partagé il en porte deux ou trois. On le
 * cite alors dans le constat : Marie a la valeur sous les yeux, elle reste
 * celle qui décide de l'écrire.
 */
export function lireCodeEtiquette(
  analyses: AnalyseBat[],
  noms?: string[]
): LectureCode {
  const trouves = new Map<string, RepereBat>();

  for (const [face, page] of facesBat(analyses).entries()) {
    for (const mot of page.mots) {
      const code = mot.texte.trim().toUpperCase();
      if (!CODE_ETIQUETTE.test(code)) continue;
      if (!trouves.has(code)) trouves.set(code, repereMot(mot, page, face, `Code étiquette ${code}`));
    }
  }

  if (trouves.size === 1) {
    const [valeur, repere] = [...trouves][0];
    return {
      propose: {
        table: "fiche",
        champ: "codeEtiquette",
        valeur,
        source: `lu sur le BAT : « ${valeur} »`,
        reperes: [repere],
      },
    };
  }

  if (trouves.size > 1) {
    return {
      propose: null,
      motif: `Plusieurs codes étiquette imprimés sur les faces analysées (${[...trouves.keys()].join(", ")}) — le dossier de BAT couvre plusieurs conditionnements. À trancher sur le BAT.`,
    };
  }

  const desFichiers = [...new Set((noms ?? []).map(codeDuNomDeFichier).filter((c): c is string => c !== null))];
  return {
    propose: null,
    motif:
      desFichiers.length > 0
        ? `Aucun code étiquette lisible sur les faces analysées (BAT vectorisé). Les fichiers s'appellent ${desFichiers.join(", ")} — à reporter sur la fiche après vérification.`
        : "Aucun code étiquette lisible sur les faces analysées (BAT vectorisé).",
  };
}

/** Le code que porte le nom d'un fichier de BAT, quand il en porte un. */
function codeDuNomDeFichier(nom: string): string | null {
  const base = nom.split("/").pop() ?? nom;
  const m = /^(ET[A-Z]{2,6}\d{3,5}(?:V\d{1,2})?)/.exec(base.toUpperCase());
  return m ? m[1] : null;
}

/**
 * Le constat que Marie doit lire quand la fiche est muette et l'étiquette non.
 *
 * Émis seulement si la fiche ne porte pas déjà la donnée : quand elle la porte,
 * c'est la comparaison BAT ↔ fiche qui a du sens, pas une proposition.
 */
export interface EntreePropositions {
  poidsNet?: string | null;
  codeEtiquette?: string | null;
}

export function controlerPropositions(
  analyses: AnalyseBat[],
  entree: EntreePropositions,
  noms?: string[]
): BatTextCheck[] {
  const checks: BatTextCheck[] = [];

  if (!entree.poidsNet?.trim()) {
    const proposition = proposerPoidsNet(analyses);
    if (proposition) {
      checks.push({
        id: "PROP_POIDS_NET",
        origine: "texte",
        rubrique: "Quantité nette",
        libelle: "Quantité nette absente de la fiche",
        statut: "WARNING",
        manqueSurLaFiche: "la quantité nette",
        justification: `La fiche ne porte pas de quantité nette, mais le BAT l'imprime — ${proposition.source}. À enregistrer sur la fiche, qui reste la référence.`,
        checklistId: "6.1",
        proposition,
        reperes: proposition.reperes,
      });
    }
  }

  // Aucune des 178 fiches ne porte de code étiquette : le point 15.1 réclame
  // une saisie à l'échelle du catalogue, alors que la mention est imprimée sur
  // la contre-étiquette et lisible par le code.
  if (!entree.codeEtiquette?.trim()) {
    const base = {
      id: "PROP_CODE_ETIQUETTE",
      origine: "texte" as const,
      rubrique: "Code étiquette",
      libelle: "Code étiquette absent de la fiche",
      statut: "WARNING" as const,
      manqueSurLaFiche: "le code étiquette",
      checklistId: "15.1",
    };
    const lecture = lireCodeEtiquette(analyses, noms);
    checks.push(
      lecture.propose
        ? {
            ...base,
            justification: `La fiche ne porte pas de code étiquette, mais le BAT l'imprime — ${lecture.propose.source}. À enregistrer sur la fiche, qui reste la référence.`,
            proposition: lecture.propose,
            reperes: lecture.propose.reperes,
          }
        : { ...base, justification: `La fiche ne porte pas de code étiquette. ${lecture.motif}` }
    );
  }

  return checks;
}
