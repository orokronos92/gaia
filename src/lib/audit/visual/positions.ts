/**
 * Contrôles de position relative — PRO-QHS-013 §1, §4 et §6.
 *
 * Trois exigences ne portent ni sur le texte ni sur sa taille, mais sur l'endroit
 * où il est posé :
 *
 *   - la dénomination et le poids net dans le **même champ visuel** (§1, §4) ;
 *   - l'origine des matières premières **sous** le code de l'organisme de
 *     contrôle (§6), lui-même sous l'Eurofeuille (§11.1).
 *
 * Le « champ de vision » de l'INCO (art. 2.2.k) est l'ensemble des surfaces
 * lisibles d'un seul angle de vue. Sur un BAT — un fichier par face — cela se
 * traduit sans ambiguïté : **une même page = un même champ visuel**, deux pages
 * = deux champs. La seule contre-hypothèse serait une imposition d'imprimeur
 * plaçant deux faces sur une page ; on donne donc toujours la face, pour que
 * l'écart soit visible si le cas se présentait.
 *
 * Ce que le code ne fait pas : situer l'Eurofeuille, qui est un dessin. Les
 * points concernés restent donc à confirmer, avec les faits en main.
 */

import type { AnalyseBat, MotBat } from "@/lib/utils/pdf-bat";
import { normCmp, pagesDeMots } from "./mesure-mentions";
import type { BatTextCheck } from "./text-robot";

/** 1 point PostScript = 1/72 pouce. */
const PT_EN_MM = 25.4 / 72;

/** Mention JDG invariante du code de l'organisme de contrôle. */
const CODE_OC = "frbio01";

/**
 * Réduit un mot à ses seuls caractères alphanumériques.
 *
 * `FR-BIO-01` peut être composé avec un trait d'union, un tiret demi-cadratin ou
 * une espace insécable selon la maquette : aucun de ces choix graphiques ne
 * change le code de l'organisme de contrôle.
 */
function sansSeparateurs(texte: string): string {
  return normCmp(texte).replace(/[^a-z0-9]/g, "");
}

/** Une occurrence localisée : le mot, et la face qui le porte. */
export interface Occurrence {
  face: number;
  mot: MotBat;
}

/** Toutes les occurrences d'un mot normalisé, face par face. */
function localiser(pages: MotBat[][], correspond: (t: string) => boolean): Occurrence[] {
  const trouvees: Occurrence[] = [];
  for (const [face, mots] of pages.entries()) {
    for (const mot of mots) if (correspond(normCmp(mot.texte))) trouvees.push({ face, mot });
  }
  return trouvees;
}

/** Les faces qui portent au moins une occurrence. */
function faces(occurrences: Occurrence[]): number[] {
  return [...new Set(occurrences.map((o) => o.face))].sort((a, b) => a - b);
}

/** Libellé d'une face pour Marie : son nom de fichier si on l'a, son rang sinon. */
function nommer(face: number, noms: string[] | undefined): string {
  return noms?.[face] ?? `face ${face + 1}`;
}

/**
 * §1 et §4 — dénomination et poids net dans le même champ visuel.
 *
 * Le point reste à confirmer même quand les deux partagent une face : la
 * procédure vise la dénomination **légale** de la denrée, et la fiche porte le
 * nom sous lequel le produit est vendu. Tant que les deux ne sont pas des champs
 * distincts, le code livre le constat et laisse trancher la Qualité.
 */
export function controlerChampVisuel(
  analyses: AnalyseBat[],
  entree: { denomination?: string | null; poidsNet?: string | null },
  noms?: string[],
  checklistId: "1.4" | "6.2" = "1.4"
): BatTextCheck | null {
  // La même mesure répond à deux points : §1 la demande depuis la dénomination,
  // §4 depuis le poids net. Chacun doit pouvoir se lire seul.
  const base = {
    id: checklistId === "1.4" ? "POS_CHAMP_VISUEL" : "POS_CHAMP_VISUEL_POIDS",
    origine: "texte" as const,
    rubrique: checklistId === "1.4" ? "Dénomination" : "Quantité nette",
    libelle: "Dénomination et poids net dans le même champ visuel ?",
    checklistId,
  };

  if (!entree.denomination?.trim() || !entree.poidsNet?.trim()) return null;

  const pages = pagesDeMots(analyses);
  const cible = normCmp(entree.poidsNet);
  const motsDenom = normCmp(entree.denomination)
    .split(/[\s,.;:()]+/)
    .filter((m) => m.length >= 4);
  if (motsDenom.length === 0) return null;

  const poids = localiser(pages, (t) => t === cible);
  const denom = localiser(pages, (t) => motsDenom.includes(t));

  if (poids.length === 0 || denom.length === 0) {
    const manquant = poids.length === 0 ? "le poids net" : "la dénomination";
    return {
      ...base,
      statut: "WARNING",
      justification: `Position non vérifiable : ${manquant} n'a pas été localisé sur les faces analysées.`,
    };
  }

  const facesPoids = faces(poids);
  const facesDenom = faces(denom);
  const communes = facesPoids.filter((f) => facesDenom.includes(f));
  const reserve =
    " Le contrôle porte sur la dénomination légale de la denrée ; la fiche porte le nom commercial — à confirmer sur le BAT.";

  if (communes.length === 0) {
    return {
      ...base,
      statut: "WARNING",
      justification: `« ${entree.denomination} » sur ${facesDenom
        .map((f) => nommer(f, noms))
        .join(", ")}, « ${entree.poidsNet} » sur ${facesPoids
        .map((f) => nommer(f, noms))
        .join(", ")} : faces différentes, donc champs visuels différents.${reserve}`,
    };
  }

  // Sur une face commune, on donne l'écart : il rend visible le cas — rare mais
  // possible — d'une imposition plaçant deux faces sur une même page.
  const face = communes[0];
  const p = poids.find((o) => o.face === face)!.mot;
  const d = denom.find((o) => o.face === face)!.mot;
  const ecart = Math.hypot(p.x - d.x, p.y - d.y) * PT_EN_MM;

  return {
    ...base,
    statut: "WARNING",
    justification: `« ${entree.denomination} » et « ${entree.poidsNet} » sur la même face (${nommer(
      face,
      noms
    )}), distants de ${ecart.toFixed(1)} mm : même champ visuel.${reserve}`,
  };
}

/**
 * §6 — l'origine des matières premières sous le code de l'organisme de contrôle.
 *
 * Les deux mentions sont des invariants JDG imprimés sur l'étiquette
 * (`FR-BIO-01`, « Agriculture UE/non UE »), donc sans ambiguïté de champ. Reste
 * hors de portée du code : l'Eurofeuille au-dessus des deux, qui est un dessin.
 */
export function controlerOrigineSousCodeOc(
  analyses: AnalyseBat[],
  noms?: string[]
): BatTextCheck {
  const base = {
    id: "POS_ORIGINE_SOUS_OC",
    origine: "texte" as const,
    rubrique: "Origine",
    libelle: "Origine des matières premières placée sous le code de l'organisme de contrôle ?",
    checklistId: "8.1",
  };

  const pages = pagesDeMots(analyses);
  const codes = localiser(pages, (t) => sansSeparateurs(t) === CODE_OC);
  const origines = localiser(pages, (t) => t === "agriculture");

  if (codes.length === 0 || origines.length === 0) {
    const manquant = codes.length === 0 ? "FR-BIO-01" : "la mention « Agriculture… »";
    return {
      ...base,
      statut: "WARNING",
      justification: `Position non vérifiable : ${manquant} n'a pas été localisé sur les faces analysées.`,
    };
  }

  const communes = faces(codes).filter((f) => faces(origines).includes(f));
  if (communes.length === 0) {
    return {
      ...base,
      statut: "FAIL",
      justification: `FR-BIO-01 sur ${faces(codes)
        .map((f) => nommer(f, noms))
        .join(", ")} et la mention d'origine sur ${faces(origines)
        .map((f) => nommer(f, noms))
        .join(", ")} : l'origine ne peut pas figurer sous le code.`,
    };
  }

  const face = communes[0];
  const code = codes.find((o) => o.face === face)!.mot;
  const origine = origines.find((o) => o.face === face)!.mot;
  // Les ordonnées de poppler croissent vers le bas : « sous » signifie y plus grand.
  const dessous = origine.y > code.y;
  const ecart = Math.abs(origine.y - code.y) * PT_EN_MM;

  if (!dessous) {
    return {
      ...base,
      statut: "FAIL",
      justification: `Sur ${nommer(face, noms)}, la mention d'origine est ${ecart.toFixed(
        1
      )} mm AU-DESSUS de FR-BIO-01 — la procédure §6 l'exige en dessous.`,
    };
  }

  return {
    ...base,
    statut: "WARNING",
    justification: `Sur ${nommer(face, noms)}, la mention d'origine est ${ecart.toFixed(
      1
    )} mm sous FR-BIO-01 : conforme au §6. Reste à confirmer que l'Eurofeuille les surmonte dans le même champ visuel (§11.1), un logo n'étant pas lisible dans le texte du PDF.`,
  };
}

/** Les contrôles de position d'un produit, mesurés sur ses BAT. */
export function controlerPositions(
  analyses: AnalyseBat[],
  entree: { denomination?: string | null; poidsNet?: string | null },
  noms?: string[]
): BatTextCheck[] {
  return [
    controlerChampVisuel(analyses, entree, noms, "1.4"),
    controlerChampVisuel(analyses, entree, noms, "6.2"),
    controlerOrigineSousCodeOc(analyses, noms),
  ].filter((c): c is BatTextCheck => c !== null);
}
