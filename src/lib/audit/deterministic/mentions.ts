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
