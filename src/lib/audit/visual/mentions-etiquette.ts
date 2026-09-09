/**
 * Ce que l'étiquette dit d'elle-même — PRO-QHS-013 §2.1, §9, §11.1, §5, §6.
 *
 * Six points étaient déclarés « contrôle visuel » ou « à évaluer » alors que
 * leur réponse est écrite en toutes lettres sur le BAT. Le registre les avait
 * classés ainsi parce qu'on ne savait comparer qu'à la fiche : « ingrédients »
 * n'est pas un champ stocké, donc rien à comparer. Mais on ne compare plus à la
 * fiche — **on lit l'étiquette**, et le mot y est ou n'y est pas.
 *
 * Mesuré sur les 258 BAT du référentiel : « ingrédients » est lisible sur
 * 97 produits sur 139, `FR-BIO-01` sur 102, la mention bio sur 94. Ce ne sont
 * pas des contrôles théoriques.
 *
 * Une règle tenue partout : un point dont la procédure demande **davantage** que
 * ce que le texte prouve ne passe pas au vert. On y verse le fait mesuré, et la
 * Qualité tranche le reste.
 */

import { motsSitues, normCmp, texteComplet, type MotSitue } from "./mesure-mentions";
import { repereMot, type RepereBat } from "./reperes";
import type { BatTextCheck } from "./text-robot";
import type { AnalyseBat } from "@/lib/utils/pdf-bat";

/** Signe métrologique « estimé » (U+212E). La politique JDG l'interdit. */
const SIGNE_ESTIME = "℮";

export interface EntreeMentions {
  ingredients?: string | null;
}

const repere = (m: MotSitue, libelle: string): RepereBat =>
  repereMot(m.mot, m.page, m.face, libelle);

/**
 * Forme comparable d'un mot imprimé.
 *
 * Poppler rend « noir*, » avec sa virgule, la fiche écrit « noir* » : sans
 * retirer la ponctuation de bord, aucun ingrédient ne se retrouve jamais. On ne
 * touche pas à l'étoile, qui porte la certification bio et fait partie du mot.
 */
const noyau = (texte: string) => normCmp(texte).replace(/^[,.;:()]+|[,.;:()]+$/g, "");
/** §2.1 — le mot « ingrédients » précède la liste (point 2.1). */
export function controlerMotIngredients(
  analyses: AnalyseBat[],
  entree: EntreeMentions
): BatTextCheck {
  const base = {
    id: "MENT_INGREDIENTS",
    origine: "texte" as const,
    rubrique: "Liste des ingrédients",
    libelle: "Le mot « ingrédients » précède-t-il la liste ?",
    checklistId: "2.1",
  };

  const mots = motsSitues(analyses);
  const entete = mots.find((m) => /^ingredients?$/.test(normCmp(m.mot.texte)));
  if (!entete) {
    return {
      ...base,
      statut: "WARNING",
      justification:
        "Le mot « ingrédients » n'a pas été retrouvé dans le texte des faces analysées — à vérifier à l'œil.",
    };
  }

  const reperes = [repere(entete, `« ${entete.mot.texte} »`)];
  // La fiche préfixe parfois sa liste par « Ingrédients : » — comparer l'en-tête
  // du BAT à ce préfixe reviendrait à le comparer à lui-même.
  const premier = normCmp(entree.ingredients ?? "")
    .split(/[\s,.;:()]+/)
    .filter((m) => m.length >= 3 && !/^ingredients?$/.test(m))[0];

  if (!premier) {
    return {
      ...base,
      statut: "WARNING",
      reperes,
      justification: `« ${entete.mot.texte} » est présent sur le BAT, mais la fiche ne porte pas de liste d'ingrédients : impossible de vérifier qu'il la précède.`,
    };
  }

  // « Précède » se lit dans l'ordre de lecture de la face, celui que poppler
  // restitue : le premier ingrédient doit venir après l'en-tête, sur la même face.
  const suite = mots.find(
    (m) => m.face === entete.face && m.index > entete.index && noyau(m.mot.texte) === premier
  );

  if (!suite) {
    return {
      ...base,
      statut: "WARNING",
      reperes,
      justification: `« ${entete.mot.texte} » est présent, mais le premier ingrédient (« ${premier} ») n'a pas été retrouvé après lui sur la même face — à vérifier à l'œil.`,
    };
  }

  return {
    ...base,
    statut: "PASS",
    reperes: [...reperes, repere(suite, `premier ingrédient`)],
    justification: `« ${entete.mot.texte} » précède bien la liste, qui commence par « ${suite.mot.texte} ».`,
  };
}

/** §11.1 — les étoiles vont avec leur mention de certification (point 2.4). */
export function controlerEtoilesBio(analyses: AnalyseBat[]): BatTextCheck | null {
  const base = {
    id: "MENT_ETOILES",
    origine: "texte" as const,
    rubrique: "Liste des ingrédients",
    libelle: "Étoiles bio / demeter accompagnées de leur mention de certification ?",
    checklistId: "2.4",
  };

  const texte = texteComplet(analyses);
  const normalise = normCmp(texte);
  const deuxEtoiles = texte.includes("**");
  const uneEtoile = texte.includes("*");
  if (!uneEtoile) return null; // aucune étoile : le point ne se pose pas ici

  const mentionBio = /issu de l.agriculture biologique/.test(normalise);
  const mentionDemeter = /biodynamique/.test(normalise);

  const manques: string[] = [];
  if (!mentionBio) manques.push("« *Issu de l'agriculture biologique »");
  if (deuxEtoiles && !mentionDemeter) {
    manques.push("« **… biologique et biodynamique » (demeter)");
  }

  const mots = motsSitues(analyses);
  const ancre = mots.find((m) => /^issu$/.test(normCmp(m.mot.texte)));
  const reperes = ancre ? [repere(ancre, "Mention de certification")] : [];

  if (manques.length > 0) {
    return {
      ...base,
      statut: "FAIL",
      reperes,
      justification: `Des ingrédients portent ${deuxEtoiles ? "une et deux étoiles" : "une étoile"}, mais ${manques.join(" et ")} ${manques.length > 1 ? "sont absentes" : "est absente"} du BAT.`,
    };
  }

  return {
    ...base,
    statut: "PASS",
    reperes,
    justification: deuxEtoiles
      ? "Étoiles simple et double présentes, avec les deux mentions de certification."
      : "Étoile bio présente, avec sa mention de certification.",
  };
}

/** §11.1 — le code de l'organisme de contrôle est imprimé (point 13.2). */
export function controlerCodeOc(analyses: AnalyseBat[]): BatTextCheck {
  const base = {
    id: "MENT_CODE_OC",
    origine: "texte" as const,
    rubrique: "Labels et signes de qualité",
    libelle: "Code de l'organisme de contrôle présent (FR-BIO-01) ?",
    checklistId: "13.2",
  };

  const trouve = motsSitues(analyses).find(
    (m) => normCmp(m.mot.texte).replace(/[^a-z0-9]/g, "") === "frbio01"
  );

  if (!trouve) {
    return {
      ...base,
      statut: "WARNING",
      justification:
        "FR-BIO-01 n'a pas été retrouvé dans le texte des faces analysées. Cela ne prouve pas son absence — un code vectorisé n'est plus du texte — mais il est à vérifier.",
    };
  }

  return {
    ...base,
    statut: "PASS",
    reperes: [repere(trouve, "FR-BIO-01")],
    justification: `Code « ${trouve.mot.texte} » imprimé sur le BAT.`,
  };
}

/** §9 — le « ℮ » métrologique doit être absent (politique JDG, point 11.1). */
export function controlerSigneEstime(analyses: AnalyseBat[]): BatTextCheck {
  const base = {
    id: "MENT_SIGNE_ESTIME",
    origine: "texte" as const,
    rubrique: "Métrologie",
    libelle: "Le « ℮ » métrologique est-il bien absent ?",
    checklistId: "11.1",
  };

  const porteur = motsSitues(analyses).find((m) => m.mot.texte.includes(SIGNE_ESTIME));
  if (porteur) {
    return {
      ...base,
      statut: "FAIL",
      reperes: [repere(porteur, "Signe ℮")],
      justification: `Le signe « ℮ » figure sur le BAT, dans « ${porteur.mot.texte} ». La politique des Jardins de Gaïa l'interdit.`,
    };
  }

  return {
    ...base,
    statut: "PASS",
    justification: "Aucun « ℮ » dans le texte du BAT — conforme à la politique JDG.",
  };
}

/** §6 — la mention d'origine est imprimée (point 8.2, présence seulement). */
export function controlerMentionOrigine(analyses: AnalyseBat[]): BatTextCheck {
  const base = {
    id: "MENT_ORIGINE",
    origine: "texte" as const,
    rubrique: "Origine",
    libelle: "Mention « Agriculture UE / non UE / pays » présente ?",
    checklistId: "8.2",
  };

  const mots = motsSitues(analyses);
  const ancre = mots.find((m) => normCmp(m.mot.texte) === "agriculture");
  if (!ancre) {
    return {
      ...base,
      statut: "WARNING",
      justification: "Aucune mention « Agriculture … » retrouvée dans le texte du BAT — à vérifier.",
    };
  }

  // On ne lit que la suite de la MÊME ligne : trois mots au hasard ramassaient
  // le début du bloc suivant, et la citation devenait fausse.
  const suite = mots
    .filter(
      (m) =>
        m.face === ancre.face &&
        m.index > ancre.index &&
        m.index <= ancre.index + 4 &&
        Math.abs(m.mot.y - ancre.mot.y) < ancre.mot.hauteur * 0.6
    )
    .map((m) => m.mot.texte)
    .join(" ");

  // Le point demande la COHÉRENCE avec ≥ 98 % des matières premières : le texte
  // ne la prouve pas. On apporte le fait, la Qualité garde la décision.
  return {
    ...base,
    statut: "WARNING",
    reperes: [repere(ancre, "Origine")],
    justification: `Mention « ${ancre.mot.texte} ${suite} » imprimée sur le BAT. Reste à établir qu'elle reflète bien ≥ 98 % des matières premières.`,
  };
}

/** §5 — le mode d'emploi est écrit, pas seulement symbolisé (point 7.1). */
export function controlerModeEmploi(analyses: AnalyseBat[]): BatTextCheck {
  const base = {
    id: "MENT_MODE_EMPLOI",
    origine: "texte" as const,
    rubrique: "Conservation / utilisation",
    libelle: "Mode d'emploi présent et rédigé, sans recours exclusif à des symboles ?",
    checklistId: "7.1",
  };

  const mots = motsSitues(analyses);
  const duree = mots.find((m) => /^\d+([-–]\d+)?(min|minutes)$/.test(normCmp(m.mot.texte).replace(/\s/g, "")));
  const temperature = mots.find((m) => /^\d+°?c$/.test(normCmp(m.mot.texte).replace(/\s/g, "")));
  const dose = mots.find((m) => /^\d+([.,]\d+)?g$/.test(normCmp(m.mot.texte).replace(/\s/g, "")));

  const trouves = [
    duree && { m: duree, quoi: `durée « ${duree.mot.texte} »` },
    temperature && { m: temperature, quoi: `température « ${temperature.mot.texte} »` },
    dose && { m: dose, quoi: `dose « ${dose.mot.texte} »` },
  ].filter((x): x is { m: MotSitue; quoi: string } => Boolean(x));

  if (trouves.length === 0) {
    return {
      ...base,
      statut: "WARNING",
      justification:
        "Aucun élément de mode d'emploi retrouvé en toutes lettres — durée, température ou dose. À vérifier : la procédure interdit de n'utiliser que des symboles.",
    };
  }

  const reperes = trouves.map((t) => repere(t.m, t.quoi));
  const detail = trouves.map((t) => t.quoi).join(", ");

  // Le §5 n'impose pas les trois éléments : il dit que le mode d'emploi porte
  // « par exemple » sur la dose, la température et la durée, et il n'interdit
  // qu'UNE chose — « n'utiliser QUE des symboles ». Un seul élément retrouvé en
  // toutes lettres suffit donc à prouver la règle. Réclamer les trois laissait
  // une ligne orange sur des étiquettes conformes.
  const manquants = [
    !duree ? "durée" : null,
    !temperature ? "température" : null,
    !dose ? "dose" : null,
  ].filter((x): x is string => x !== null);

  const reserve = manquants.length > 0 ? ` Non retrouvé en toutes lettres : ${manquants.join(", ")}.` : "";
  return {
    ...base,
    statut: "PASS",
    reperes,
    justification: `Mode d'emploi rédigé sur le BAT : ${detail}. Ce sont des caractères, pas des symboles.${reserve}`,
  };
}

/** Les mentions que l'étiquette porte en toutes lettres. */
export function controlerMentions(
  analyses: AnalyseBat[],
  entree: EntreeMentions
): BatTextCheck[] {
  return [
    controlerMotIngredients(analyses, entree),
    controlerEtoilesBio(analyses),
    controlerCodeOc(analyses),
    controlerSigneEstime(analyses),
    controlerMentionOrigine(analyses),
    controlerModeEmploi(analyses),
  ].filter((c): c is BatTextCheck => c !== null);
}
