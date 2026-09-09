/**
 * Contrôles typographiques mesurés sur le BAT — PRO-QHS-013 §12 et §4.
 *
 * Ces deux points étaient déclarés `manual` : « à vérifier à l'œil ». Or un œil
 * ne tranche pas 1,07 mm contre un seuil de 0,9 mm, et la donnée est dans le
 * fichier. Le PDF déclare le corps exact de chaque mot (`Tf` × `Tm`) et la
 * police déclare sa hauteur de x et sa hauteur de capitale (`/XHeight`,
 * `/CapHeight`) : la hauteur imprimée est un produit, pas une estimation.
 *
 *   hauteur imprimée (mm) = métrique/1000 × corps(pt) × 25,4/72
 *
 * Deux principes tenus :
 *
 *   - **Aucune approximation.** Un mot dont le corps ou la police n'a pas été
 *     rattaché ne produit pas de mesure — il produit une absence de mesure. Un
 *     contrôle typographique n'a pas le droit d'inventer un chiffre.
 *   - **Aucun bruit.** On ne mesure que les mentions que l'on sait localiser par
 *     leur texte. Mesurer tous les mots ferait remonter le plus petit texte
 *     décoratif de l'étiquette comme une non-conformité réglementaire.
 */

import { hauteurCapitaleMm, type AnalyseBat } from "@/lib/utils/pdf-bat";
import {
  facesBat,
  mesurerMention,
  motsMesures,
  normCmp,
  toutesPolices,
  type MesureMention,
} from "./mesure-mentions";
import {
  poidsNetEnGrammes,
  seuilHauteurChiffresMm,
  trancheSurface,
  type TrancheSurface,
} from "./seuils-typo";
import { repereMot } from "./reperes";
import type { BatTextCheck } from "./text-robot";

// Point d'entrée unique des contrôles typographiques : l'appelant n'a pas à
// savoir dans quel module vivent les seuils ou la mesure.
export * from "./mesure-mentions";
export * from "./seuils-typo";

export interface EntreeTypo {
  /** Mentions obligatoires à mesurer, telles que déclarées sur la fiche. */
  denomination?: string | null;
  ingredients?: string | null;
  mentionConservation?: string | null;
  mentionFabricant?: string | null;
  poidsNet?: string | null;
}

/** §12 — hauteur de x des mentions obligatoires (point 14.1). */
function controlerHauteurX(
  analyses: AnalyseBat[],
  entree: EntreeTypo,
  tranche: TrancheSurface,
  surfaceCm2: number
): BatTextCheck {
  const base = {
    id: "TYPO_HAUTEUR_X",
    origine: "texte" as const,
    rubrique: "Taille des caractères",
    libelle: "Hauteur de x des mentions obligatoires conforme à la face la plus grande ?",
    checklistId: "14.1",
  };

  const faces = facesBat(analyses);
  const polices = toutesPolices(analyses);

  // Sous 10 cm², la procédure n'exige plus que quatre mentions sur l'emballage ;
  // les autres peuvent légitimement être fournies autrement. On ne mesure donc
  // que ce qui est réellement exigible à cette taille.
  const candidates: [string, string | null | undefined][] = tranche.mentionsReduites
    ? [
        ["Dénomination", entree.denomination],
        ["Quantité nette", entree.poidsNet],
      ]
    : [
        ["Dénomination", entree.denomination],
        ["Liste d'ingrédients", entree.ingredients],
        ["Conservation", entree.mentionConservation],
        ["Fabricant", entree.mentionFabricant],
        ["Quantité nette", entree.poidsNet],
      ];

  const declarees = candidates.filter(
    (c): c is [string, string] => typeof c[1] === "string" && c[1].trim() !== ""
  );

  const mesures: MesureMention[] = [];
  const absentes: string[] = [];
  const nonRattachees: string[] = [];

  for (const [nom, valeur] of declarees) {
    const r = mesurerMention(valeur, faces, polices);
    if (r === "absente") absentes.push(nom);
    else if (r === "corps-non-rattache") nonRattachees.push(nom);
    else mesures.push({ ...r, mention: nom });
  }

  // Une mention dont tous les mots n'ont pas été mesurés peut cacher plus petit
  // que ce qu'on annonce : on ne la présente jamais comme entièrement vérifiée.
  const partielles = mesures.filter((m) => m.motsMesures < m.motsTrouves);

  const contexte = `Face la plus grande ${surfaceCm2} cm² (${tranche.libelle}) → seuil ${tranche.seuilHauteurXmm} mm.`;

  // Une mention absente des faces analysées n'est pas un problème de taille :
  // c'est un problème de présence, que son contrôle dédié remonte déjà. On le
  // signale ici sans le compter deux fois comme non-conformité.
  const reserves: string[] = [];
  if (absentes.length > 0) {
    reserves.push(
      `${absentes.join(", ")} : non retrouvée sur les faces analysées — voir le contrôle de présence.`
    );
  }
  if (nonRattachees.length > 0) {
    reserves.push(
      `${nonRattachees.join(", ")} : présente mais son corps n'a pas pu être lu — mesure à l'œil nécessaire.`
    );
  }
  if (partielles.length > 0) {
    reserves.push(
      `Mesure partielle : ${partielles
        .map((m) => `${m.mention} (${m.motsMesures}/${m.motsTrouves} mots)`)
        .join(", ")} — le reste à l'œil.`
    );
  }
  const reserve = reserves.length > 0 ? ` ${reserves.join(" ")}` : "";

  // Toutes les réserves ne retiennent pas le point. Une mention ABSENTE des
  // faces relève de son propre contrôle de présence — la retenir ici mettait
  // 14.1 en orange pour une raison qui n'est pas la sienne. Une mesure
  // PARTIELLE, elle, le retient : un mot non mesuré peut être plus petit que le
  // seuil, et on ne conclut pas sur ce qu'on n'a pas vu.
  const retiennent = partielles.length > 0 || nonRattachees.length > 0;

  if (mesures.length === 0) {
    return {
      ...base,
      statut: "WARNING",
      justification: `${contexte} Aucune mention obligatoire n'a pu être mesurée sur le BAT.${reserve}`,
    };
  }

  const detail = mesures
    .map((m) => `${m.mention} ${m.hauteurXmm} mm (${m.police} ${m.corpsPt} pt)`)
    .join(" ; ");

  // Chaque mention mesurée désigne le mot qui a décidé de sa hauteur : c'est
  // celui-là qu'il faut montrer, pas la mention entière.
  const reperes = mesures
    .map((m) => (m.repere ? { ...m.repere, libelle: `${m.mention} ${m.hauteurXmm} mm` } : null))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const sousSeuil = mesures.filter((m) => m.hauteurXmm < tranche.seuilHauteurXmm);
  if (sousSeuil.length > 0) {
    return {
      ...base,
      statut: "FAIL",
      reperes,
      justification: `${contexte} Sous le seuil : ${sousSeuil
        .map((m) => `${m.mention} ${m.hauteurXmm} mm`)
        .join(", ")}. Mesuré : ${detail}.${reserve}`,
    };
  }

  const marge = Math.min(...mesures.map((m) => m.hauteurXmm)) - tranche.seuilHauteurXmm;
  return {
    ...base,
    statut: retiennent ? "WARNING" : "PASS",
    reperes,
    justification: `${contexte} Conforme, marge ${marge.toFixed(3)} mm. Mesuré : ${detail}.${reserve}`,
  };
}

/** §4 — hauteur des chiffres de la quantité nette (point 6.2). */
function controlerHauteurChiffres(analyses: AnalyseBat[], entree: EntreeTypo): BatTextCheck | null {
  const base = {
    id: "TYPO_HAUTEUR_CHIFFRES",
    origine: "texte" as const,
    rubrique: "Quantité nette",
    libelle: "Hauteur des chiffres de la quantité nette conforme au grammage ?",
    checklistId: "6.2",
  };

  // Le seuil de hauteur se lit sur le grammage : sans quantité nette au dossier,
  // il n'y a pas de seuil, donc pas de mesure — et c'est la fiche qu'il faut
  // compléter, pas le BAT qu'il faut aller rechercher.
  if (!entree.poidsNet || entree.poidsNet.trim() === "") {
    return {
      ...base,
      statut: "WARNING",
      manqueSurLaFiche: "la quantité nette",
      justification:
        "Hauteur non mesurable : la fiche ne porte pas de quantité nette — le seuil §4 se déduit du grammage.",
    };
  }

  const grammes = poidsNetEnGrammes(entree.poidsNet);
  if (grammes === null) {
    return {
      ...base,
      statut: "WARNING",
      justification: `Quantité nette « ${entree.poidsNet} » non exprimée en masse — seuil §4 indéterminable.`,
    };
  }
  const seuil = seuilHauteurChiffresMm(grammes);

  const cible = normCmp(entree.poidsNet);
  const polices = toutesPolices(analyses);
  const faces = facesBat(analyses);
  const trouve = motsMesures(analyses).find((m) => normCmp(m.texte) === cible);
  const facePoids = faces.findIndex((f) => f.mots.includes(trouve as never));

  if (!trouve) {
    return {
      ...base,
      statut: "WARNING",
      justification: `Seuil §4 : ${seuil} mm pour ${grammes} g. La quantité nette « ${entree.poidsNet} » n'a pas été localisée avec son corps sur le BAT — mesure impossible.`,
    };
  }

  const metrique = polices[trouve.police as string];
  const hauteur = metrique ? hauteurCapitaleMm(trouve.corpsPt as number, metrique) : null;
  if (hauteur === null) {
    return {
      ...base,
      statut: "WARNING",
      justification: `Seuil §4 : ${seuil} mm pour ${grammes} g. La police ${trouve.police} ne déclare pas de hauteur de capitale — hauteur des chiffres non mesurable, contrôle visuel nécessaire.`,
    };
  }

  const mesure = `« ${trouve.texte} » en ${metrique.nom} ${trouve.corpsPt} pt → chiffres ${hauteur} mm, seuil ${seuil} mm pour ${grammes} g`;
  const reperes =
    facePoids >= 0
      ? [repereMot(trouve, faces[facePoids], facePoids, `Chiffres ${hauteur} mm`)]
      : [];

  if (hauteur < seuil) {
    return { ...base, statut: "FAIL", reperes, justification: `${mesure}. Non conforme.` };
  }

  // La hauteur est acquise. Le « même champ visuel que la dénomination » exigé
  // par le même paragraphe est mesuré à part et rattaché au même point : les
  // deux constats s'additionnent sur la ligne que Marie lit.
  return { ...base, statut: "PASS", reperes, justification: `${mesure}. Hauteur conforme.` };
}

/** §2.3 — exemption d'étiquetage nutritionnel sous 25 cm² (point 4.1). */
function controlerExemptionNutritionnelle(surfaceCm2: number, tranche: TrancheSurface): BatTextCheck | null {
  if (!tranche.exemptionNutritionnelle) return null;
  return {
    id: "TYPO_EXEMPTION_NUTRI",
    origine: "texte",
    rubrique: "Déclaration nutritionnelle",
    libelle: "Exemption d'étiquetage nutritionnel ?",
    statut: "PASS",
    justification: `Face la plus grande ${surfaceCm2} cm², sous le seuil de 25 cm² : l'étiquetage nutritionnel ne s'applique pas (PRO-QHS-013 §2.3).`,
    checklistId: "4.1",
  };
}

/**
 * §10.2 — régime de dématérialisation de l'Info-Tri, selon la surface.
 *
 * Le décret 2022-975 art. 2 ne pose pas une règle unique : entre 20 et 40 cm²
 * le Triman reste obligatoire mais le cartouche peut être dématérialisé ; sous
 * 20 cm² tout peut l'être, à condition que l'information figure sur le site du
 * producteur. Au-dessus, les deux sont exigés sur l'emballage.
 *
 * Le décret vise l'emballage **cylindrique ou sphérique** : la forme, nous ne
 * la connaissons pas. Le contrôle livre donc la surface mesurée et le régime
 * qu'elle ouvre, et laisse la Qualité conclure. C'est une mesure, pas un
 * verdict — mais elle évite de réclamer un cartouche que la loi n'exige pas.
 */
function controlerDematerialisationInfoTri(surfaceCm2: number): BatTextCheck {
  const base = {
    id: "TYPO_DEMAT_INFOTRI",
    origine: "texte" as const,
    rubrique: "Pictogrammes",
    libelle: "Le cartouche Info-Tri est-il exigé sur cet emballage ?",
    checklistId: "12.2",
  };
  const face = `Face la plus grande ${surfaceCm2} cm².`;

  if (surfaceCm2 < 20) {
    return {
      ...base,
      statut: "PASS",
      justification: `${face} Sous 20 cm², le décret 2022-975 art. 2 autorise une dématérialisation totale — Triman comme cartouche — si l'information figure sur le site du producteur. À confirmer pour un emballage cylindrique ou sphérique.`,
    };
  }
  if (surfaceCm2 <= 40) {
    return {
      ...base,
      statut: "WARNING",
      justification: `${face} Entre 20 et 40 cm², le décret 2022-975 art. 2 maintient le Triman sur l'emballage mais autorise à dématérialiser le cartouche Info-Tri. À confirmer pour un emballage cylindrique ou sphérique.`,
    };
  }
  return {
    ...base,
    statut: "WARNING",
    justification: `${face} Au-delà de 40 cm², aucune dématérialisation n'est prévue : Triman et cartouche Info-Tri sont attendus sur l'emballage.`,
  };
}

/**
 * Les contrôles typographiques d'un produit, mesurés sur ses BAT.
 * Sans zone de coupe exploitable, aucun seuil n'est déterminable : on le dit,
 * plutôt que de retenir une surface de page qui inclurait le fond perdu.
 */
export function controlerTypographie(analyses: AnalyseBat[], entree: EntreeTypo): BatTextCheck[] {
  const surfaces = analyses
    .flatMap((a) => a.pages)
    .map((p) => p.coupe?.surfaceCm2)
    .filter((s): s is number => typeof s === "number");

  const checks: BatTextCheck[] = [];

  if (surfaces.length === 0) {
    checks.push({
      id: "TYPO_HAUTEUR_X",
      origine: "texte",
      rubrique: "Taille des caractères",
      libelle: "Hauteur de x des mentions obligatoires conforme à la face la plus grande ?",
      statut: "WARNING",
      justification:
        "Aucune zone de coupe (TrimBox) dans les BAT : la surface de la face la plus grande est inconnue, le seuil §12 n'est pas déterminable.",
      checklistId: "14.1",
    });
  } else {
    const surfaceCm2 = Math.max(...surfaces);
    const tranche = trancheSurface(surfaceCm2);
    checks.push(controlerHauteurX(analyses, entree, tranche, surfaceCm2));
    const nutri = controlerExemptionNutritionnelle(surfaceCm2, tranche);
    if (nutri) checks.push(nutri);
    checks.push(controlerDematerialisationInfoTri(surfaceCm2));
  }

  const chiffres = controlerHauteurChiffres(analyses, entree);
  if (chiffres) checks.push(chiffres);

  return checks;
}
