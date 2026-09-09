/**
 * Contrôles de graisse et de style — PRO-QHS-013 §3.1 et §11.1.
 *
 * Deux exigences portent sur la façon dont un mot est imprimé, pas sur sa
 * présence : un allergène doit se distinguer du reste de la liste, et le mot
 * « demeter » doit être en gras italique. Les deux se lisent dans le fichier —
 * chaque police embarquée déclare sa graisse (`/FontWeight`) et son inclinaison
 * (`/ItalicAngle`, `/Flags`).
 *
 * Une limite assumée : **le soulignement n'est pas du texte.** C'est un trait
 * vectoriel posé à côté du mot, indiscernable des autres traits de l'étiquette.
 * La procédure accepte « Gras, Souligné » : quand la graisse ne distingue pas
 * l'allergène, on ne conclut donc pas à la faute — on demande de vérifier le
 * soulignement à l'œil.
 */

import { estGrasse, estItalique, type AnalyseBat, type MetriquePolice } from "@/lib/utils/pdf-bat";
import { facesBat, normCmp, toutesPolices } from "./mesure-mentions";
import { repereMot, type RepereBat } from "./reperes";
import type { BatTextCheck } from "./text-robot";

export interface EntreeStyle {
  /** Dénomination déclarée — sert à retrouver ses mots sur le BAT. */
  denomination?: string | null;
  /** Allergènes déclarés sur la fiche, tels quels. */
  allergenes?: string | null;
  /** Liste d'ingrédients déclarée, qui sert de style de référence. */
  ingredients?: string | null;
  /** Le produit porte-t-il la certification Demeter ? */
  estDemeter?: boolean;
}

/** Le style d'un mot imprimé, tel que sa police le déclare. */
interface StyleMot {
  texte: string;
  police: MetriquePolice;
  corpsPt: number;
  repere: RepereBat;
}

/** Les mots mesurés de toutes les faces, chacun sachant où il est. */
function motsStyles(analyses: AnalyseBat[]): StyleMot[] {
  const polices = toutesPolices(analyses);
  const styles: StyleMot[] = [];
  for (const [face, page] of facesBat(analyses).entries()) {
    for (const mot of page.mots) {
      if (mot.corpsPt === null || mot.police === null) continue;
      const police = polices[mot.police];
      if (!police) continue;
      styles.push({
        texte: mot.texte,
        police,
        corpsPt: mot.corpsPt,
        repere: repereMot(mot, page, face, mot.texte),
      });
    }
  }
  return styles;
}

/**
 * Les mots d'un texte, ponctuation pliée, mots courts écartés.
 *
 * « Aucun » est une réponse, pas un allergène : le laisser passer faisait
 * chercher le mot « aucun » sur l'étiquette et produisait une ligne absurde
 * dans la liste de travail.
 */
const NEGATIONS = new Set(["aucun", "aucune", "neant", "sans", "non"]);

function motsDe(valeur: string): string[] {
  return normCmp(valeur)
    .split(/[\s,.;:()]+/)
    .filter((m) => m.length >= 4 && !NEGATIONS.has(m));
}

/**
 * §3.1 — l'allergène se distingue-t-il du reste de la liste ?
 *
 * La référence n'est pas « gras dans l'absolu » mais « distinct du reste » : on
 * compare donc la police de l'allergène à celle qui domine la liste
 * d'ingrédients. Une liste entièrement en gras ne mettrait rien en évidence.
 */
export function controlerAllergeneEnEvidence(
  analyses: AnalyseBat[],
  entree: EntreeStyle
): BatTextCheck | null {
  const base = {
    id: "TYPO_ALLERGENE_EVIDENCE",
    origine: "texte" as const,
    rubrique: "Particularités",
    libelle: "Allergènes mis en évidence dans la liste des ingrédients ?",
    checklistId: "5.1",
  };

  const declares = motsDe(entree.allergenes ?? "");
  if (declares.length === 0) return null;

  const mots = motsStyles(analyses);

  // Police dominante de la liste d'ingrédients : le style de référence.
  const motsListe = new Set(motsDe(entree.ingredients ?? ""));
  const comptes = new Map<string, number>();
  for (const m of mots) {
    if (!motsListe.has(normCmp(m.texte))) continue;
    comptes.set(m.police.nom, (comptes.get(m.police.nom) ?? 0) + 1);
  }
  const reference = [...comptes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const trouves = mots.filter((m) => declares.includes(normCmp(m.texte)));
  const reperes = trouves.map((m) => ({ ...m.repere, libelle: `Allergène « ${m.texte} »` }));
  if (trouves.length === 0) {
    return {
      ...base,
      statut: "WARNING",
      justification: `Allergène(s) « ${declares.join(", ")} » non localisé(s) avec leur police sur le BAT — mise en évidence non vérifiable, contrôle à l'œil.`,
    };
  }

  const detail = trouves
    .map((m) => `« ${m.texte} » en ${m.police.nom}${estGrasse(m.police) ? " (gras)" : ""}`)
    .join(", ");

  if (!reference) {
    return {
      ...base,
      statut: "WARNING",
      justification: `${detail}. Le style du reste de la liste n'a pas pu être établi — comparaison impossible, contrôle à l'œil.`,
    };
  }

  const distingues = trouves.filter((m) => m.police.nom !== reference);
  if (distingues.length === trouves.length) {
    return {
      ...base,
      statut: "PASS",
      reperes,
      justification: `${detail}, distinct du reste de la liste (${reference}).`,
    };
  }

  // Ni le gras ni un changement de police : reste le soulignement, que le texte
  // du PDF ne porte pas. On ne conclut pas à la faute sur une preuve absente.
  return {
    ...base,
    statut: "WARNING",
    reperes,
    justification: `${detail} — même police que le reste de la liste (${reference}). Aucune mise en évidence par la graisse : vérifier un soulignement, qui n'est pas détectable dans le texte du PDF.`,
  };
}

/** §11.1 — le mot « demeter » doit être en gras italique (charte Demeter). */
export function controlerDemeterGrasItalique(
  analyses: AnalyseBat[],
  entree: EntreeStyle
): BatTextCheck | null {
  const base = {
    id: "TYPO_DEMETER_STYLE",
    origine: "texte" as const,
    rubrique: "Labels et signes de qualité",
    libelle: "Mot « demeter » en gras italique ?",
    checklistId: "2.4",
  };

  const occurrences = motsStyles(analyses).filter((m) =>
    normCmp(m.texte).includes("demeter")
  );

  // Produit non Demeter et mot absent : rien à dire, et surtout rien à ajouter
  // au bruit de la liste de travail.
  if (occurrences.length === 0) return entree.estDemeter === true ? { ...base, statut: "WARNING", justification: "Produit déclaré Demeter mais le mot « demeter » n'a pas été localisé avec sa police sur le BAT — contrôle à l'œil." } : null;

  const fautives = occurrences.filter((m) => !estGrasse(m.police) || !estItalique(m.police));
  const reperesDemeter = occurrences.map((m) => ({ ...m.repere, libelle: "demeter" }));
  const decrire = (m: StyleMot) =>
    `« ${m.texte} » en ${m.police.nom} (${estGrasse(m.police) ? "gras" : "maigre"}, ${estItalique(m.police) ? "italique" : "droit"})`;

  if (fautives.length > 0) {
    return {
      ...base,
      statut: "FAIL",
      reperes: reperesDemeter,
      justification: `${fautives.map(decrire).join(" ; ")} — la charte Demeter impose le gras italique.`,
    };
  }

  return {
    ...base,
    statut: "PASS",
    reperes: reperesDemeter,
    justification: `${occurrences.map(decrire).join(" ; ")}.`,
  };
}

/**
 * §1 — « La dénomination de la denrée doit être imprimée en caractères droits. »
 *
 * Une exigence de forme, mesurable : l'italique se lit dans la police du PDF,
 * comme le gras du §11.1. On ne juge que les mots assez longs pour être
 * identifiants — un « à » ou un « de » en italique appartient à la mise en page,
 * pas à la dénomination.
 */
export function controlerDenominationDroite(
  analyses: AnalyseBat[],
  entree: EntreeStyle
): BatTextCheck | null {
  const base = {
    id: "TYPO_DENOM_DROITE",
    origine: "texte" as const,
    rubrique: "Dénomination",
    libelle: "Dénomination imprimée en caractères droits ?",
    checklistId: "1.4",
  };

  const mots = normCmp(entree.denomination ?? "")
    .split(/[\s,.;:()]+/)
    .filter((m) => m.length >= 4);
  if (mots.length === 0) return null;

  const occurrences = motsStyles(analyses).filter((m) => mots.includes(normCmp(m.texte)));
  if (occurrences.length === 0) return null;

  const penchees = occurrences.filter((m) => estItalique(m.police));
  if (penchees.length === 0) {
    return {
      ...base,
      statut: "PASS",
      justification: `${occurrences.length} mot(s) de la dénomination mesurés, tous en caractères droits.`,
    };
  }
  return {
    ...base,
    statut: "FAIL",
    reperes: penchees.map((m) => ({ ...m.repere, libelle: `${m.texte} — italique` })),
    justification: `${penchees
      .map((m) => `« ${m.texte} » en ${m.police.nom} (italique)`)
      .join(" ; ")} — le §1 impose des caractères droits pour la dénomination.`,
  };
}

/** Les contrôles de style d'un produit, mesurés sur ses BAT. */
export function controlerStyle(analyses: AnalyseBat[], entree: EntreeStyle): BatTextCheck[] {
  return [
    controlerAllergeneEnEvidence(analyses, entree),
    controlerDemeterGrasItalique(analyses, entree),
    controlerDenominationDroite(analyses, entree),
  ].filter((c): c is BatTextCheck => c !== null);
}
