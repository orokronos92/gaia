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
import type { MesureEurofeuille } from "./eurofeuille";
import { facesBat, normCmp } from "./mesure-mentions";
import { repereBoitePdf, repereMot, type RepereBat } from "./reperes";
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

  // Se taire ici laissait le point retomber sur « BAT absent ou face illisible »,
  // alors que le BAT est là et lisible : c'est la fiche qui ne dit pas quoi
  // chercher. On nomme ce qui manque, et le point demande à être complété.
  const denomination = entree.denomination?.trim();
  const poidsNet = entree.poidsNet?.trim();
  if (!denomination || !poidsNet) {
    const manquants = [!denomination ? "la dénomination" : null, !poidsNet ? "la quantité nette" : null].filter(
      (m): m is string => m !== null
    );
    return {
      ...base,
      statut: "WARNING",
      manqueSurLaFiche: manquants.join(" et "),
      justification: `Position non mesurable : la fiche ne porte pas ${manquants.join(" ni ")} — sans cette valeur, il n'y a rien à localiser sur le BAT.`,
    };
  }

  const facesLues = facesBat(analyses);
  const pages = facesLues.map((f) => f.mots);
  const cible = normCmp(poidsNet);
  const motsDenom = normCmp(denomination)
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
  const reperes: RepereBat[] = [
    repereMot(d, facesLues[face], face, "Dénomination"),
    repereMot(p, facesLues[face], face, "Poids net"),
  ];

  return {
    ...base,
    statut: "WARNING",
    reperes,
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
  noms?: string[],
  /** Eurofeuille mesurée face par face, dans le même ordre que `analyses`. */
  eurofeuilles?: (MesureEurofeuille | null)[]
): BatTextCheck {
  const base = {
    id: "POS_ORIGINE_SOUS_OC",
    origine: "texte" as const,
    rubrique: "Origine",
    libelle: "Origine des matières premières placée sous le code de l'organisme de contrôle ?",
    checklistId: "8.1",
  };

  const facesLues = facesBat(analyses);
  const pages = facesLues.map((f) => f.mots);
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

  // L'Eurofeuille au-dessus des deux (§11.1). Sa boîte vient du tracé, en repère
  // PDF (origine en bas) ; les mots viennent de poppler (origine en haut). On
  // ramène le logo dans le repère des mots avant de comparer quoi que ce soit.
  const surmonte = surmonteLeCode(analyses, face, code, eurofeuilles);

  // Les trois éléments que §6 et §11.1 veulent empilés — le logo n'y figure que
  // s'il a été reconnu, ne pas reconnaître un dessin n'étant pas une absence.
  const logo = eurofeuilles?.[face];
  const reperes: RepereBat[] = [
    ...(logo ? [repereBoitePdf(logo, facesLues[face], face, "Eurofeuille")] : []),
    repereMot(code, facesLues[face], face, "Code OC"),
    repereMot(origine, facesLues[face], face, "Origine"),
  ];

  if (!dessous) {
    return {
      ...base,
      statut: "FAIL",
      justification: `Sur ${nommer(face, noms)}, la mention d'origine est ${ecart.toFixed(
        1
      )} mm AU-DESSUS de FR-BIO-01 — la procédure §6 l'exige en dessous.`,
    };
  }

  const debut = `Sur ${nommer(face, noms)}, la mention d'origine est ${ecart.toFixed(1)} mm sous FR-BIO-01 : conforme au §6.`;

  if (surmonte === null) {
    return {
      ...base,
      statut: "WARNING",
      reperes,
      justification: `${debut} L'Eurofeuille n'ayant pas été reconnue sur cette face, sa position au-dessus des deux mentions (§11.1) reste à confirmer à l'œil.`,
    };
  }

  if (!surmonte.auDessus) {
    return {
      ...base,
      statut: "FAIL",
      reperes,
      justification: `${debut} Mais l'Eurofeuille ne surmonte pas le code : son bord inférieur est ${surmonte.ecartMm.toFixed(
        1
      )} mm SOUS FR-BIO-01, alors que §11.1 la veut au-dessus.`,
    };
  }

  return {
    ...base,
    statut: "PASS",
    reperes,
    justification: `${debut} L'Eurofeuille la surmonte de ${surmonte.ecartMm.toFixed(
      1
    )} mm sur la même face : même champ visuel, ordre conforme au §11.1.`,
  };
}

/**
 * L'Eurofeuille surmonte-t-elle le code OC, sur la face qui les porte ?
 *
 * Renvoie `null` si le logo n'a pas été reconnu sur cette face : ne pas
 * reconnaître un dessin n'est pas la preuve qu'il n'y est pas.
 */
function surmonteLeCode(
  analyses: AnalyseBat[],
  face: number,
  code: MotBat,
  eurofeuilles?: (MesureEurofeuille | null)[]
): { auDessus: boolean; ecartMm: number } | null {
  const logo = eurofeuilles?.[face];
  if (!logo) return null;

  const hauteurPage = analyses.flatMap((a) => a.pages)[face]?.hauteurPt;
  if (!hauteurPage) return null;

  // Bord inférieur du logo, ramené dans le repère descendant de poppler.
  const basDuLogo = hauteurPage - logo.y0;
  return {
    auDessus: basDuLogo <= code.y,
    ecartMm: Math.abs(code.y - basDuLogo) * PT_EN_MM,
  };
}

/** Les contrôles de position d'un produit, mesurés sur ses BAT. */
export function controlerPositions(
  analyses: AnalyseBat[],
  entree: { denomination?: string | null; poidsNet?: string | null },
  noms?: string[],
  eurofeuilles?: (MesureEurofeuille | null)[]
): BatTextCheck[] {
  return [
    controlerChampVisuel(analyses, entree, noms, "1.4"),
    controlerChampVisuel(analyses, entree, noms, "6.2"),
    controlerOrigineSousCodeOc(analyses, noms, eurofeuilles),
  ].filter((c): c is BatTextCheck => c !== null);
}
