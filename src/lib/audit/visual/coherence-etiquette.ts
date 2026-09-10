/**
 * La recette étiquette dit-elle ce que le BAT imprime ? — point 2.5.
 *
 * La recette de production nomme les matières comme le magasinier les pèse :
 * « SORWATHE OP1 ». L'étiquette imprime la dénomination légale : « thé noir ».
 * La Qualité fait la traduction sur la carte « recette étiquette », ligne par
 * ligne — et si elle ne l'a pas faite, personne ne le voyait.
 *
 * Ce contrôle a d'abord été écrit côté fiche : il comparait la recette au texte
 * de la fiche dégustation. Il change de camp le 2026-09-10 pour une raison de
 * fond — **détecter sur la fiche seule qu'un nom est « un nom fournisseur » est
 * impossible**. Rien ne distingue `SORWATHE OP1` de `THYM`, qui est une
 * dénomination parfaitement valable. Le BAT, lui, tranche sans deviner : si le
 * nom est le bon il s'y trouve, sinon il n'y est pas.
 *
 * Rien n'est réécrit ici. Apparier « thé noir » et « SORWATHE OP1 » pour
 * recopier l'un sur l'autre serait exactement la devinette que l'application a
 * passé sa semaine à retirer de la lecture des classeurs.
 */

import { motsSitues, normCmp, texteComplet, type MotSitue } from "./mesure-mentions";
import { repereMot, type RepereBat } from "./reperes";
import type { BatTextCheck } from "./text-robot";
import type { AnalyseBat } from "@/lib/utils/pdf-bat";

/** Mots trop courts ou trop communs pour prouver qu'un ingrédient est imprimé. */
const MOTS_VIDES = new Set([
  "de", "du", "des", "la", "le", "les", "un", "une", "en", "et", "aux", "au",
  "a", "d", "l", "bio", "naturel", "naturels", "naturelle", "naturelles",
]);

/** Un mot ne compte comme preuve qu'à partir de cette longueur. */
const LONGUEUR_SIGNIFIANTE = 4;

export interface LigneEtiquetteBat {
  /** Le nom tel qu'il doit être imprimé (reprise de la Qualité, ou nom R&D). */
  designation: string;
  /** Le nom de la recette de production, pour dire d'où vient l'écart. */
  designationRecette: string;
  pourcentage: number;
  /** % volontairement masqué sur l'étiquette (secret industriel). */
  masque: boolean;
}

export interface EntreeCoherence {
  lignesEtiquette?: LigneEtiquetteBat[] | null;
}

/**
 * Forme comparable d'un mot imprimé — poppler colle la ponctuation au texte, et
 * l'étoile de certification fait partie du mot mais pas de la dénomination.
 */
const noyau = (texte: string) =>
  normCmp(texte).replace(/^[,.;:()*]+|[,.;:()*]+$/g, "");

/** Les mots d'une dénomination qui peuvent réellement servir de preuve. */
export function motsSignifiants(designation: string): string[] {
  return normCmp(designation)
    .split(/[^\p{L}\p{N}]+/u)
    .map((m) => m.trim())
    .filter((m) => m.length >= LONGUEUR_SIGNIFIANTE && !MOTS_VIDES.has(m));
}

/** Tous les pourcentages imprimés sur le BAT, en nombres. */
function pourcentagesImprimes(texte: string): Set<number> {
  const trouves = new Set<number>();
  for (const m of texte.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) {
    const v = Number(m[1].replace(",", "."));
    if (Number.isFinite(v)) trouves.add(v);
  }
  return trouves;
}

const repere = (m: MotSitue, libelle: string): RepereBat =>
  repereMot(m.mot, m.page, m.face, libelle);

/**
 * 2.5 — la liste qui sera imprimée correspond-elle à ce que le BAT imprime ?
 *
 * Une dénomination est tenue pour présente quand **tous** ses mots signifiants
 * se lisent sur le BAT. Un seul mot manquant suffit à la déclarer absente : sur
 * une étiquette, « arôme naturel de figue » et « AROME BIO 2022 figue » ne sont
 * pas la même mention, même s'ils partagent « figue ».
 *
 * Une ligne dont aucun mot n'est signifiant (« OP1 », « B12 ») ne peut être ni
 * confirmée ni infirmée : elle est signalée à part plutôt que comptée en faute.
 *
 * Deux absences, deux gravités. Une dénomination que la Qualité a relue et que
 * le BAT n'imprime pas, c'est une contradiction entre deux documents — FAIL. Une
 * dénomination restée au nom de la recette, c'est une relecture qui n'a pas eu
 * lieu — WARNING. Confondre les deux mettrait tout le catalogue au rouge le jour
 * où la carte est créée, et noierait les vraies non-conformités.
 */
export function controlerCoherenceEtiquette(
  analyses: AnalyseBat[],
  entree: EntreeCoherence
): BatTextCheck | null {
  const lignes = entree.lignesEtiquette ?? [];
  const base = {
    id: "MENT_COHERENCE_ETIQUETTE",
    origine: "texte" as const,
    rubrique: "Liste des ingrédients",
    libelle:
      "La liste d'ingrédients de la recette étiquette correspond-elle à celle imprimée sur le BAT ?",
    checklistId: "2.5",
  };

  if (lignes.length === 0) {
    return {
      ...base,
      statut: "WARNING",
      justification:
        "Aucune recette étiquette : il n'y a rien à confronter à la liste imprimée.",
    };
  }

  const mots = motsSitues(analyses);
  const presents = new Set(mots.map((m) => noyau(m.mot.texte)).filter(Boolean));
  const texte = texteComplet(analyses);

  /** Relues par la Qualité et pourtant absentes : les documents se contredisent. */
  const contredites: LigneEtiquetteBat[] = [];
  /** Encore au nom de la recette : le travail n'a pas été fait, ce n'est pas une faute. */
  const nonRelues: LigneEtiquetteBat[] = [];
  const indecidables: LigneEtiquetteBat[] = [];
  const reperes: RepereBat[] = [];

  for (const ligne of lignes) {
    const attendus = motsSignifiants(ligne.designation);
    if (attendus.length === 0) {
      indecidables.push(ligne);
      continue;
    }
    const manquants = attendus.filter((m) => !presents.has(m));
    if (manquants.length === 0) {
      const ancre = mots.find((m) => noyau(m.mot.texte) === attendus[0]);
      if (ancre && reperes.length < 6) reperes.push(repere(ancre, ligne.designation));
      continue;
    }
    const relue =
      ligne.designation.trim().toLowerCase() !== ligne.designationRecette.trim().toLowerCase();
    (relue ? contredites : nonRelues).push(ligne);
  }

  const imprimes = pourcentagesImprimes(texte);
  const pourcentagesAbsents = lignes.filter(
    (l) => !l.masque && !imprimes.has(l.pourcentage)
  );

  const constats: string[] = [];
  if (contredites.length > 0) {
    constats.push(
      `le BAT n'imprime pas ${contredites.map((l) => `« ${l.designation} »`).join(", ")}`
    );
  }
  if (nonRelues.length > 0) {
    constats.push(
      `${nonRelues.map((l) => `« ${l.designation} »`).join(", ")} : dénomination d'étiquette jamais relue, elle porte encore le nom de la recette et ne figure pas sur le BAT`
    );
  }
  if (pourcentagesAbsents.length > 0) {
    constats.push(
      `${pourcentagesAbsents
        .map((l) => `${l.pourcentage} % (${l.designation})`)
        .join(", ")} : ce pourcentage ne se lit pas sur le BAT`
    );
  }
  if (indecidables.length > 0) {
    constats.push(
      `${indecidables.map((l) => `« ${l.designation} »`).join(", ")} : trop court pour être recherché sur le BAT, à vérifier à l'œil`
    );
  }

  // Un nom que la Qualité a relu et que le BAT n'imprime pas : deux documents
  // qui se contredisent, c'est une faute. Un nom jamais relu : du travail en
  // attente, et le mettre au rouge noierait les vraies non-conformités.
  if (contredites.length > 0) {
    return { ...base, statut: "FAIL", reperes, justification: `${constats.join(" ; ")}.` };
  }
  if (constats.length > 0) {
    return { ...base, statut: "WARNING", reperes, justification: `${constats.join(" ; ")}.` };
  }
  return {
    ...base,
    statut: "PASS",
    reperes,
    justification: `Les ${lignes.length} dénominations de la recette étiquette et leurs pourcentages se lisent sur le BAT.`,
  };
}
