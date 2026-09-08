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

import { estGrasse, estItalique, type AnalyseBat, type MetriquePolice, type MotBat } from "@/lib/utils/pdf-bat";
import { motsMesures, normCmp, toutesPolices } from "./mesure-mentions";
import type { BatTextCheck } from "./text-robot";

export interface EntreeStyle {
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
}

function styleDe(mot: MotBat, polices: Record<string, MetriquePolice>): StyleMot | null {
  if (mot.corpsPt === null || mot.police === null) return null;
  const police = polices[mot.police];
  return police ? { texte: mot.texte, police, corpsPt: mot.corpsPt } : null;
}

/** Les mots d'un texte, ponctuation pliée, mots courts écartés. */
function motsDe(valeur: string): string[] {
  return normCmp(valeur)
    .split(/[\s,.;:()]+/)
    .filter((m) => m.length >= 4);
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

  const polices = toutesPolices(analyses);
  const mots = motsMesures(analyses)
    .map((m) => styleDe(m, polices))
    .filter((s): s is StyleMot => s !== null);

  // Police dominante de la liste d'ingrédients : le style de référence.
  const motsListe = new Set(motsDe(entree.ingredients ?? ""));
  const comptes = new Map<string, number>();
  for (const m of mots) {
    if (!motsListe.has(normCmp(m.texte))) continue;
    comptes.set(m.police.nom, (comptes.get(m.police.nom) ?? 0) + 1);
  }
  const reference = [...comptes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const trouves = mots.filter((m) => declares.includes(normCmp(m.texte)));
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
      justification: `${detail}, distinct du reste de la liste (${reference}).`,
    };
  }

  // Ni le gras ni un changement de police : reste le soulignement, que le texte
  // du PDF ne porte pas. On ne conclut pas à la faute sur une preuve absente.
  return {
    ...base,
    statut: "WARNING",
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

  const polices = toutesPolices(analyses);
  const occurrences = motsMesures(analyses)
    .filter((m) => normCmp(m.texte).includes("demeter"))
    .map((m) => styleDe(m, polices))
    .filter((s): s is StyleMot => s !== null);

  // Produit non Demeter et mot absent : rien à dire, et surtout rien à ajouter
  // au bruit de la liste de travail.
  if (occurrences.length === 0) return entree.estDemeter === true ? { ...base, statut: "WARNING", justification: "Produit déclaré Demeter mais le mot « demeter » n'a pas été localisé avec sa police sur le BAT — contrôle à l'œil." } : null;

  const fautives = occurrences.filter((m) => !estGrasse(m.police) || !estItalique(m.police));
  const decrire = (m: StyleMot) =>
    `« ${m.texte} » en ${m.police.nom} (${estGrasse(m.police) ? "gras" : "maigre"}, ${estItalique(m.police) ? "italique" : "droit"})`;

  if (fautives.length > 0) {
    return {
      ...base,
      statut: "FAIL",
      justification: `${fautives.map(decrire).join(" ; ")} — la charte Demeter impose le gras italique.`,
    };
  }

  return {
    ...base,
    statut: "PASS",
    justification: `${occurrences.map(decrire).join(" ; ")}.`,
  };
}

/** Les contrôles de style d'un produit, mesurés sur ses BAT. */
export function controlerStyle(analyses: AnalyseBat[], entree: EntreeStyle): BatTextCheck[] {
  return [
    controlerAllergeneEnEvidence(analyses, entree),
    controlerDemeterGrasItalique(analyses, entree),
  ].filter((c): c is BatTextCheck => c !== null);
}
