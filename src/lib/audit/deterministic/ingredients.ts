/**
 * Deterministic ingredient-list controls (PRO-QHS-013 §2.1). Order and
 * mono-ingredient checks read the recette. The "Ingrédients :" prefix check
 * (2.1) is NOT here: it's a manual BAT control, since the prefix is label
 * decoration and not a stored field. Absent data → WARNING (never a silent PASS).
 */

import { lireListeDeclaree } from "@/lib/recette/liste-declaree";
import { mentionDue } from "../statut-mention";
import type { AuditInput, ControlStatus, DeterministicVerdict } from "../types";

/** 2.2 — INGR_ORDRE_DECROISSANT: descending weight order along ordreTri. */
export function checkIngrOrdreDecroissant(input: AuditInput): DeterministicVerdict {
  if (input.ingredients.length === 0) {
    return { statut: "WARNING", action: "COMPLETER", justification: "Aucune recette : ordre non vérifiable." };
  }
  const tries = [...input.ingredients].sort((a, b) => a.ordreTri - b.ordreTri);
  for (let i = 1; i < tries.length; i++) {
    if (tries[i].pourcentageBrut > tries[i - 1].pourcentageBrut + 1e-6) {
      return {
        statut: "FAIL",
        justification: `Ordre non décroissant : « ${tries[i].designation} » (${tries[i].pourcentageBrut} %) après « ${tries[i - 1].designation} » (${tries[i - 1].pourcentageBrut} %).`,
      };
    }
  }
  return { statut: "PASS", justification: "Ingrédients par ordre pondéral décroissant." };
}

/** 2.3 — INGR_MONO: mono-ingredient list omission. NA when multi-ingredient. */
export function checkIngrMono(input: AuditInput): DeterministicVerdict {
  if (input.ingredients.length > 1) {
    return { statut: "NA", justification: "Produit multi-ingrédients." };
  }
  if (input.ingredients.length === 0) {
    return { statut: "WARNING", action: "COMPLETER", justification: "Aucune recette : cas mono-ingrédient non vérifiable." };
  }
  return {
    statut: "WARNING",
    justification: "Mono-ingrédient : vérifier que la liste est correctement omise (dénomination = nom de l'ingrédient).",
  };
}

/** Keeps the worst verdict when several observations land on one control. */
const GRAVITE: Record<string, number> = { PASS: 0, NA: 0, WARNING: 1, FAIL: 2 };
const pire = (a: ControlStatus, b: ControlStatus): ControlStatus =>
  (GRAVITE[b] ?? 0) > (GRAVITE[a] ?? 0) ? b : a;

/**
 * 2.5 — INGR_COHERENCE_RECETTE: the recette and the declared list must tell the
 * same story.
 *
 * Two JDG documents describe one product. The recette workbook holds the
 * composition and the certification ticks; the dégustation sheet holds the
 * label copy, written by hand with consumer wording — "thé noir*", where the
 * recette says "SORWATHE OP1". Both are legitimate, and neither may be rewritten
 * into the other: replacing the label wording with supplier names would degrade
 * the very text the audit compares to the BAT.
 *
 * So they are compared instead. A recipe declaring Demeter matières against a
 * list carrying no "**" is a certification claimed in one document and denied in
 * the other — and until now nobody saw it. The reverse matters more: "**" on a
 * label whose recipe declares no Demeter is an unfounded claim on a printed
 * pack. Marie decides; this only states the divergence.
 *
 * Quality's own call wins: `statutDemeter` at OUI or NON overrides what the
 * recette suggests, exactly as it does for the BAT mention controls.
 */
export function checkCoherenceRecetteListe(input: AuditInput): DeterministicVerdict {
  const recette = input.ingredients;
  const declaree = lireListeDeclaree(input.fiche.ingredientsFr);

  if (recette.length === 0) {
    return { statut: "WARNING", action: "COMPLETER", justification: "Aucune recette : la cohérence avec la liste déclarée n'est pas vérifiable." };
  }
  if (declaree.entrees.length === 0) {
    return { statut: "WARNING", action: "COMPLETER", justification: "Aucune liste d'ingrédients déclarée : la cohérence avec la recette n'est pas vérifiable." };
  }

  const demeterRecette = recette.filter((i) => i.estDemeter);
  const demeterDeclares = declaree.entrees.filter((e) => e.marqueurs >= 2);
  const demeterDu = mentionDue(input.fiche.statutDemeter, demeterRecette.length > 0);

  const constats: string[] = [];
  let statut: ControlStatus = "PASS";

  // Un « NON » de la Qualité éteint toute la question Demeter : la liste n'a
  // alors pas à porter d'étoile double, quoi que dise la recette.
  if (demeterDu) {
    if (demeterDeclares.length === 0) {
      statut = pire(statut, "FAIL");
      const noms = demeterRecette.map((i) => i.designation).join(", ");
      constats.push(
        demeterRecette.length > 0
          ? `la recette déclare ${demeterRecette.length} matière(s) Demeter (${noms}) mais aucune entrée de la liste déclarée ne porte « ** »`
          : `la Qualité a fixé la mention Demeter à OUI mais aucune entrée de la liste déclarée ne porte « ** »`
      );
    } else if (demeterRecette.length > 0 && demeterDeclares.length !== demeterRecette.length) {
      statut = pire(statut, "FAIL");
      constats.push(
        `${demeterRecette.length} matière(s) Demeter dans la recette contre ${demeterDeclares.length} entrée(s) marquée(s) « ** » dans la liste déclarée`
      );
    }
  } else if (demeterDeclares.length > 0) {
    statut = pire(statut, "FAIL");
    const noms = demeterDeclares.map((e) => e.designation).join(", ");
    constats.push(
      `la liste déclarée porte « ** » sur ${demeterDeclares.length} entrée(s) (${noms}) alors qu'aucune matière de la recette n'est Demeter`
    );
  }

  if (declaree.entrees.length !== recette.length) {
    statut = pire(statut, "WARNING");
    constats.push(
      `la liste déclarée compte ${declaree.entrees.length} entrée(s) pour ${recette.length} ligne(s) de recette`
    );
  }

  // Un % imprimé qui ne correspond à aucun % de la recette : soit la recette a
  // changé sans que l'étiquette suive, soit le texte a été saisi à la main.
  const pourcentagesRecette = new Set(recette.map((i) => i.pourcentageEtiquette));
  const orphelins = declaree.entrees.filter(
    (e) => e.pourcentage !== null && !pourcentagesRecette.has(e.pourcentage)
  );
  if (orphelins.length > 0) {
    statut = pire(statut, "WARNING");
    constats.push(
      `${orphelins.map((e) => `« ${e.designation} » ${e.pourcentage} %`).join(", ")} : ce pourcentage ne figure dans aucune ligne de la recette`
    );
  }

  if (statut === "PASS") {
    return {
      statut,
      justification: `Liste déclarée et recette concordantes : ${recette.length} ingrédient(s), ${demeterDeclares.length} marqué(s) « ** » Demeter.`,
    };
  }
  return { statut, justification: `${constats.join(" ; ")}.` };
}
