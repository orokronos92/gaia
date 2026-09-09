/**
 * Deterministic mention / code controls — canonical JDG string matches and
 * field-presence checks (PRO-QHS-013 §4, §5, §7, §13). Absent or unconfirmable
 * data → WARNING; structurally wrong data → FAIL. Gencode (10.1) and code OC
 * (13.2) are NOT here: they're BAT/vision controls, absent from the fiche.
 */

import {
  FABRICANT_JDG_TOKENS,
  MASS_UNIT_PATTERN,
  normalize,
} from "../canonical";
import { poidsEnGrammes } from "../code-article";
import type { AuditInput, DeterministicVerdict } from "../types";

const VOLUME_PATTERN = /\d+([.,]\d+)?\s*(ml|cl|l)\b/i;
const CONSERVATION_TOKENS = ["abri", "humidite", "lumiere", "chaleur"] as const;

/** 6.1 — QTE_NETTE_UNITE: net quantity in a mass unit (g/kg). */
export function checkQteNetteUnite(input: AuditInput): DeterministicVerdict {
  const poids = input.produit.poidsNet;
  if (!poids || poids.trim() === "") {
    return { statut: "WARNING", action: "COMPLETER", justification: "Poids net non renseigné — à compléter." };
  }
  if (MASS_UNIT_PATTERN.test(poids)) {
    return { statut: "PASS", justification: `Quantité nette en unité de masse (« ${poids.trim()} »).` };
  }
  if (VOLUME_PATTERN.test(poids)) {
    return {
      statut: "FAIL",
      justification: `Quantité nette exprimée en volume (« ${poids.trim()} ») — une unité de masse est requise.`,
    };
  }
  return { statut: "WARNING", justification: `Unité du poids net « ${poids.trim()} » non reconnue — à vérifier.` };
}

/** 7.2 — CONSERVATION_MENTION: mandatory JDG conservation mention. */
export function checkConservationMention(input: AuditInput): DeterministicVerdict {
  const mention = input.fiche.mentionConservation;
  if (!mention || mention.trim() === "") {
    return { statut: "WARNING", action: "COMPLETER", justification: "Mention de conservation absente — à compléter." };
  }
  const normalized = normalize(mention);
  if (CONSERVATION_TOKENS.every((t) => normalized.includes(t))) {
    return { statut: "PASS", justification: "Mention de conservation JDG présente." };
  }
  return {
    statut: "WARNING",
    justification: "Mention de conservation présente mais divergente du libellé JDG — à vérifier.",
    suggestionIa: "Utiliser « À conserver à l'abri de l'humidité, de la lumière et de la chaleur ».",
  };
}

/** 9.1 — FABRICANT_ADRESSE: complete JDG manufacturer address. */
export function checkFabricantAdresse(input: AuditInput): DeterministicVerdict {
  const mention = input.fiche.mentionFabricant;
  if (!mention || mention.trim() === "") {
    return { statut: "WARNING", action: "COMPLETER", justification: "Adresse fabricant absente — à compléter." };
  }
  const normalized = normalize(mention);
  const manquants = FABRICANT_JDG_TOKENS.filter((t) => !normalized.includes(t));
  if (manquants.length === 0) {
    return { statut: "PASS", justification: "Adresse JDG complète (Wittisheim)." };
  }
  return {
    statut: "WARNING",
    justification: `Adresse fabricant incomplète (manque : ${manquants.join(", ")}) — à vérifier.`,
  };
}

/** 15.1 — CODE_ETIQUETTE: label code present on the back label. */
export function checkCodeEtiquette(input: AuditInput): DeterministicVerdict {
  const code = input.fiche.codeEtiquette;
  if (!code || code.trim() === "") {
    return { statut: "WARNING", action: "COMPLETER", justification: "Code étiquette absent — à compléter." };
  }
  return { statut: "PASS", justification: `Code étiquette présent (${code.trim()}).` };
}

/**
 * §1.3 — noms usuels utilisables pour une plante à infusion.
 *
 * La réglementation ne définit aucune dénomination légale pour les infusions :
 * la procédure ferme donc elle-même la liste. Un nom commercial — « Magie des
 * bois » — n'en fait pas partie, et le §1 interdit explicitement qu'il tienne
 * lieu de dénomination.
 */
const NOMS_USUELS_INFUSION = [
  "tisane",
  "infusion",
  "preparation de plantes",
  "preparations de plantes",
  "melange de plantes",
  "melanges de plantes",
] as const;

/** 1.6 — DENOM_NOM_USUEL : la dénomination d'une infusion est-elle un nom usuel ? */
export function checkNomUsuelInfusion(input: AuditInput): DeterministicVerdict {
  const denom = input.fiche.denominationLegale;
  if (!denom || denom.trim() === "") {
    return {
      statut: "WARNING",
      action: "COMPLETER",
      justification: "Dénomination légale absente de la fiche — à compléter (§1.3).",
    };
  }
  const n = normalize(denom);
  const trouve = NOMS_USUELS_INFUSION.find((u) => n.includes(u));
  if (trouve) {
    return { statut: "PASS", justification: `Dénomination « ${denom.trim()} » : nom usuel « ${trouve} » (§1.3).` };
  }
  return {
    statut: "WARNING",
    action: "COMPLETER",
    justification: `« ${denom.trim()} » ne contient aucun des noms usuels du §1.3 (tisane, infusion, préparation ou mélange de plantes). Le §1 interdit qu'un nom commercial tienne lieu de dénomination de la denrée.`,
  };
}

/** La dose de référence du §3.2, en grammes par tasse. */
const GRAMMES_PAR_TASSE = 2;

/** Un nombre de tasses écrit « 50 », « 50 tasses », « environ 50 ». */
function nombreDeTasses(valeur?: string | null): number | null {
  const m = /(\d+)/.exec(valeur ?? "");
  return m ? Number(m[1]) : null;
}

/**
 * 6.3 — QTE_NETTE_TASSES : le nombre de tasses suit-il le poids net ?
 *
 * §3.2 : « nombre de tasses calculé avec 2 g par tasse ». Un écart ne prouve
 * pas une erreur — la dose peut être autre — mais alors le § impose « x g » sur
 * le logo tasse. Dans les deux cas, la Qualité doit le regarder : d'où un
 * constat qui dit la dose implicite plutôt qu'un verdict sec.
 */
export function checkNombreTasses(input: AuditInput): DeterministicVerdict {
  const tasses = nombreDeTasses(input.produit.nbTasses);
  const grammes = poidsEnGrammes(input.produit.poidsNet ?? "");
  if (tasses === null || grammes === null) {
    const manque = tasses === null ? "le nombre de tasses" : "la quantité nette";
    return { statut: "WARNING", action: "COMPLETER", justification: `Comparaison impossible : ${manque} n'est pas renseigné.` };
  }
  if (tasses <= 0) {
    return { statut: "WARNING", action: "COMPLETER", justification: "Nombre de tasses non exploitable." };
  }

  // Une demi-tasse ne s'imprime pas : 125 g donnent 62,5 tasses, l'étiquette en
  // annonce 63. L'arrondi de l'étiquetage n'est pas un écart de dose.
  const attendu = grammes / GRAMMES_PAR_TASSE;
  if (Math.abs(attendu - tasses) <= 0.5) {
    return { statut: "PASS", justification: `${tasses} tasses pour ${grammes} g : ${GRAMMES_PAR_TASSE} g par tasse (§3.2).` };
  }
  const dose = Math.round((grammes / tasses) * 100) / 100;
  return {
    statut: "WARNING",
    action: "VERIFIER",
    justification: `${tasses} tasses pour ${grammes} g, soit ${dose} g par tasse au lieu de ${GRAMMES_PAR_TASSE} g (${attendu} tasses attendues). Si la dose est bien de ${dose} g, « ${dose} g » doit figurer sur le logo tasse (§3.2).`,
  };
}
