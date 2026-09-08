/**
 * Contrôles déterministes du code article et du Gencode — MOP-PRO-029.
 *
 * Ils portent sur la FICHE, pas sur l'étiquette : ils vérifient que le code
 * produit, le poids net et le code-barres déclarés racontent la même histoire.
 * Le point 10.1, lui, compare le code-barres imprimé sur le BAT à celui-ci —
 * c'est une lecture visuelle, elle reste manuelle.
 *
 * Aucun de ces contrôles n'invente une règle : chacun cite un paragraphe daté
 * d'une procédure signée. Une donnée manquante donne WARNING, jamais FAIL —
 * « je ne peux pas vérifier » n'est pas « c'est faux ».
 */

import {
  cleEan13,
  conditionnementParCode,
  decomposerCodeArticle,
  decomposerGencode,
  GENCODE_FABRICANT,
  GENCODE_PAYS,
  poidsCoherent,
  poidsEnGrammes,
} from "../code-article";
import type { AuditInput, DeterministicVerdict } from "../types";

const SANS_CODE: DeterministicVerdict = {
  statut: "WARNING",
  action: "COMPLETER",
  justification: "Code produit absent ou de forme non reconnue — non vérifiable.",
};

/** 16.1 — CODE_CONDITIONNEMENT : le code porte-t-il un chiffre de conditionnement ? */
export function checkCodeConditionnement(input: AuditInput): DeterministicVerdict {
  const d = decomposerCodeArticle(input.produit.codePf ?? "");
  if (!d) return SANS_CODE;

  if (!d.conditionnement) {
    return {
      statut: "WARNING",
      action: "COMPLETER",
      justification: `Le code « ${input.produit.codePf} » s'arrête au numéro d'article : aucun chiffre de conditionnement.`,
      suggestionIa:
        "Codes historiques antérieurs à la règle §2.1.3. À compléter ou à confirmer comme tels avec JDG.",
    };
  }

  const cond = conditionnementParCode(d.conditionnement);
  if (!cond) {
    return {
      statut: "FAIL",
      justification: `Chiffre de conditionnement « ${d.conditionnement} » hors des sept valeurs définies (1 à 7).`,
    };
  }

  return {
    statut: "PASS",
    justification: `Conditionnement ${d.conditionnement} — ${cond.libelle}.`,
  };
}

/** 16.2 — CODE_POIDS_COHERENT : le chiffre de conditionnement dit-il le bon poids ? */
export function checkCodePoidsCoherent(input: AuditInput): DeterministicVerdict {
  const d = decomposerCodeArticle(input.produit.codePf ?? "");
  if (!d) return SANS_CODE;
  if (!d.conditionnement) {
    return {
      statut: "WARNING",
      action: "COMPLETER",
      justification: "Pas de chiffre de conditionnement dans le code — rien à confronter au poids net.",
    };
  }

  const cond = conditionnementParCode(d.conditionnement);
  if (!cond) {
    return { statut: "WARNING", justification: "Chiffre de conditionnement inconnu — non vérifiable." };
  }

  const poidsNet = input.produit.poidsNet;
  if (!poidsNet || poidsNet.trim() === "") {
    return { statut: "WARNING", action: "COMPLETER", justification: "Poids net non renseigné — non vérifiable." };
  }

  const grammes = poidsEnGrammes(poidsNet);
  if (grammes === null) {
    return {
      statut: "WARNING",
      justification: `Poids net « ${poidsNet.trim()} » non exprimé en masse — non comparable au conditionnement ${d.conditionnement}.`,
    };
  }

  if (poidsCoherent(cond, grammes)) {
    return {
      statut: "PASS",
      justification: `Poids net ${poidsNet.trim()} cohérent avec le conditionnement ${d.conditionnement} (${cond.libelle}).`,
    };
  }

  return {
    statut: "FAIL",
    justification: `Le conditionnement ${d.conditionnement} annonce « ${cond.libelle} », le poids net déclaré est ${poidsNet.trim()}.`,
    suggestionIa: "Corriger le poids net, ou le chiffre de conditionnement du code article.",
  };
}

/** 16.3 — GENCODE_COHERENT : l'EAN déclaré décode-t-il le même produit ? */
export function checkGencodeCoherent(input: AuditInput): DeterministicVerdict {
  const ean = input.produit.codeEan?.trim();
  if (!ean) {
    return { statut: "WARNING", action: "COMPLETER", justification: "Gencode non renseigné — non vérifiable." };
  }
  if (!/^\d{13}$/.test(ean)) {
    return { statut: "FAIL", justification: `Gencode « ${ean} » : 13 chiffres attendus.` };
  }

  const d = decomposerCodeArticle(input.produit.codePf ?? "");
  const g = decomposerGencode(ean, d?.article);
  if (!g) return { statut: "WARNING", justification: "Gencode illisible — non vérifiable." };

  const anomalies: string[] = [];
  if (g.pays !== GENCODE_PAYS) anomalies.push(`préfixe pays ${g.pays} au lieu de ${GENCODE_PAYS}`);
  if (g.fabricant !== GENCODE_FABRICANT) {
    anomalies.push(`code fabricant ${g.fabricant} au lieu de ${GENCODE_FABRICANT}`);
  }
  if (cleEan13(ean.slice(0, 12)) !== g.cle) {
    anomalies.push(`clé de contrôle ${g.cle} au lieu de ${cleEan13(ean.slice(0, 12))}`);
  }
  if (d && g.article !== d.article) {
    anomalies.push(`numéro d'article ${g.article} au lieu de ${d.article}`);
  }
  if (d?.conditionnement && g.conditionnement && g.conditionnement !== d.conditionnement) {
    anomalies.push(`conditionnement ${g.conditionnement} au lieu de ${d.conditionnement}`);
  }

  if (anomalies.length > 0) {
    return {
      statut: "FAIL",
      justification: `Gencode ${ean} incohérent avec le code produit : ${anomalies.join(" ; ")}.`,
    };
  }

  const forme = g.format === "historique" ? " (format historique, article sur 4 chiffres)" : "";
  return {
    statut: "PASS",
    justification: `Gencode ${ean} cohérent : ${g.pays}·${g.fabricant}·famille ${g.famille}·article ${g.article}${g.conditionnement ? `·cond. ${g.conditionnement}` : ""}·clé ${g.cle}${forme}.`,
  };
}

/** 16.4 — GENCODE_UNICITE : deux produits ne peuvent pas partager un GTIN. */
export function checkGencodeUnicite(input: AuditInput): DeterministicVerdict {
  const ean = input.produit.codeEan?.trim();
  if (!ean) {
    return { statut: "WARNING", action: "COMPLETER", justification: "Gencode non renseigné — non vérifiable." };
  }

  const autres = input.produit.eanPartagePar ?? [];
  if (autres.length === 0) {
    return { statut: "PASS", justification: `Gencode ${ean} porté par ce seul produit.` };
  }

  return {
    statut: "FAIL",
    justification: `Gencode ${ean} également porté par ${autres.join(", ")} — deux produits distincts ne peuvent pas partager un code-barres.`,
    suggestionIa: "Attribuer un Gencode propre, ou fusionner les références si elles n'en font qu'une.",
  };
}
