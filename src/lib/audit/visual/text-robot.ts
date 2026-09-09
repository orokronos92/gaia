/**
 * Visual audit — text robot (deterministic layer).
 *
 * Compares the text printed on the BAT (all faces concatenated) against the
 * validated fiche. Pure and DB-free: the orchestrator (actions/audit-visuel)
 * extracts the BAT text and hands it here with the fiche fields.
 *
 * Deterministic by design — it never rewrites the fiche, it only checks whether
 * each expected element is actually present/identical on the artwork. The LLM
 * pass (later lot) only judges the subtle wording cases this layer leaves open.
 *
 * Verdict rule: a factual divergence (a declared ingredient/% not found) is a
 * FAIL; a mandatory mention not found on the analysed faces is a WARNING (it may
 * live elsewhere on the pack) — never a silent PASS.
 */

import { FABRICANT_JDG_TOKENS, normalize } from "../canonical";
import type { ControlStatus } from "../types";

/** JDG mandatory conservation mention — invariant tokens. */
const CONSERVATION_TOKENS = ["abri", "humidite", "lumiere", "chaleur"] as const;

/**
 * Les mentions qu'une condition seule rend exigibles.
 *
 * On cherche des **fragments invariants**, jamais la phrase entière : JDG ne
 * l'écrit pas toujours au mot près, et poppler colle la ponctuation au texte.
 * « reglisse » + « hypertension » retrouve l'avertissement quelle que soit sa
 * tournure ; la phrase complète le raterait sur une virgule.
 */
const REGLISSE_TOKENS = ["reglisse", "hypertension"] as const;

/** §3.2 — les trois mentions qui accompagnent obligatoirement une allégation. */
const MENTIONS_ALLEGATION = [
  {
    id: "TXT_ALLEG_MODE_VIE",
    tokens: ["mode de vie sain"] as const,
    libelle: "Mention « …dans le cadre d'un mode de vie sain » présente sur le BAT ?",
    absent: "Mention « mode de vie sain » non retrouvée sur les faces analysées — obligatoire avec une allégation.",
  },
  {
    id: "TXT_ALLEG_TASSES",
    tokens: ["consommation journaliere"] as const,
    libelle: "Mention « Consommation journalière conseillée » présente sur le BAT ?",
    absent: "Mention « consommation journalière conseillée » non retrouvée — obligatoire avec une allégation.",
  },
  {
    id: "TXT_ALLEG_NUTRI",
    tokens: ["informations nutritionnelles"] as const,
    libelle: "Valeurs nutritionnelles présentes sur le BAT ?",
    absent: "Mention « Informations nutritionnelles moyennes » non retrouvée — obligatoire avec une allégation.",
  },
] as const;

/** Le produit porte-t-il de la réglisse, d'après sa composition déclarée ? */
function contientReglisse(ingredients?: string | null): boolean {
  return normalize(ingredients ?? "").includes("reglisse");
}

/**
 * Le produit revendique-t-il WFTO ?
 *
 * Le champ « labels client » ne le déclare que sur 2 produits du catalogue : il
 * est inutilisable. Le champ « Mention WFTO » de la fiche, lui, est tenu — 96
 * fiches portent la phrase JDG au mot près et 51 portent « / », la convention
 * maison pour « non concerné ». On s'en sert comme drapeau, pas comme référence.
 */
function revendiqueWfto(phrase?: string | null): boolean {
  return !/^[\s/–—-]*$/.test(phrase ?? "");
}

/**
 * §11.2 — la mention WFTO, en deux marqueurs plutôt qu'un verdict.
 *
 * Mesuré sur le catalogue : deux étiquettes impriment l'adresse `wfto.com` sans
 * la mention « Membre certifié World Fair Trade Organization », jamais
 * l'inverse. Un contrôle qui exigerait les deux ensemble répondrait « absent »
 * sans dire que la moitié y est — or c'est précisément la moitié qui manque
 * qui pose question au regard des règles WFTO.
 */
function checkWfto(batN: string): BatTextCheck {
  const base = {
    id: "TXT_WFTO",
    origine: "texte" as const,
    checklistId: "13.3",
    rubrique: "Labels",
    libelle: "Mention WFTO complète sur le BAT ?",
  };
  const mention = batN.includes("world fair trade");
  const adresse = batN.includes("wfto.com");

  if (mention && adresse) {
    return { ...base, statut: "PASS", justification: "Mention WFTO et adresse wfto.com présentes sur le BAT." };
  }
  if (adresse) {
    return {
      ...base,
      statut: "WARNING",
      justification:
        "L'adresse wfto.com est imprimée, mais la mention « Membre certifié World Fair Trade Organization » n'a pas été retrouvée — à vérifier au regard des règles WFTO.",
    };
  }
  return {
    ...base,
    statut: "WARNING",
    justification: mention
      ? "La mention « World Fair Trade Organization » est imprimée, mais l'adresse wfto.com n'a pas été retrouvée."
      : "Mention WFTO non retrouvée sur les faces analysées, alors que la fiche la déclare.",
  };
}

export interface BatTextInput {
  denomination?: string | null;
  ingredients?: string | null;
  allegation?: string | null;
  allergenes?: string | null;
  poidsNet?: string | null;
  codeEtiquette?: string | null;
  mentionConservation?: string | null;
  mentionFabricant?: string | null;
  /** Champ « Mention WFTO » de la fiche — sert de drapeau, pas de référence. */
  phraseWfto?: string | null;
}

export interface BatTextCheck {
  id: string;
  rubrique: string;
  libelle: string;
  statut: ControlStatus;
  justification: string;
  /**
   * Point de la checklist auquel ce contrôle répond (PRO-QHS-013).
   *
   * L'audit BAT ouvrait sa propre liste à côté de celle de Marie : deux
   * réponses à la même question, dans deux écrans, sans lien. Rattaché, il
   * REMPLIT sa liste de travail au lieu de la dédoubler.
   */
  checklistId?: string;
  /**
   * Qui a rendu ce verdict. Le texte est du code — il peut trancher un point.
   * Le sémantique et le visuel sont des modèles : ils apportent une preuve, la
   * confirmation reste à la Qualité.
   */
  origine?: "texte" | "semantique" | "visuel";
  /**
   * Le champ de fiche qui manque pour que ce contrôle puisse aboutir.
   *
   * Un contrôle qui mesure le BAT à partir d'une donnée de la fiche ne peut
   * rien conclure quand la fiche est muette. Il se taisait, et le point
   * retombait sur le message d'un contrôle non exécuté : « BAT absent ou face
   * illisible » — faux, et il envoyait Marie chercher un problème de fichier.
   * En le nommant, le point dit ce qu'il attend et compte comme « à compléter »
   * plutôt que comme « à vérifier ».
   */
  manqueSurLaFiche?: string;
  /**
   * Valeur lue sur le BAT que la fiche pourrait enregistrer, en un clic. Le
   * contrôle ne l'applique jamais lui-même : la fiche reste la référence.
   */
  proposition?: import("./propositions").Proposition;
  /**
   * Où regarder sur le BAT. Un contrôle qui mesure sait où il a mesuré ; le
   * dire épargne à Marie de chercher le texte dont il parle.
   */
  reperes?: import("./reperes").RepereBat[];
}

/** Normalize for comparison: fold case/accents/space AND glue number+unit. */
function normCmp(value: string): string {
  return normalize(value).replace(/(\d)\s*(g|kg|mg|ml|cl|%)/gi, "$1$2");
}

function declares(value?: string | null): boolean {
  if (!value) return false;
  const n = normalize(value);
  return n !== "" && n !== "non" && n !== "aucun" && n !== "aucune";
}

/** Ingredient list + percentages must appear verbatim on the artwork. */
function checkIngredients(batN: string, input: BatTextInput): BatTextCheck {
  const base = { id: "TXT_INGREDIENTS", origine: "texte" as const, rubrique: "Liste des ingrédients", libelle: "Liste d'ingrédients et % conformes à la fiche ?" };
  if (!input.ingredients || input.ingredients.trim() === "") {
    return { ...base, statut: "WARNING", justification: "Liste d'ingrédients absente de la fiche — comparaison impossible." };
  }
  // Split on list separators (comma + space) only, so French decimals (15,5%) survive.
  // Drop the trailing "." of the last item; a masked ingredient is just its name
  // (no "%"), so it matches the BAT whether or not the artwork prints the %.
  const items = input.ingredients
    .split(/,\s+/)
    .map((s) => s.trim().replace(/\.\s*$/, ""))
    .filter(Boolean);
  const missing = items.filter((it) => !batN.includes(normCmp(it)));
  if (missing.length === 0) {
    return { ...base, statut: "PASS", justification: "Tous les ingrédients et % de la fiche figurent sur le BAT." };
  }
  return {
    ...base,
    statut: "FAIL",
    justification: `Non retrouvé(s) à l'identique sur le BAT : ${missing.join(" ; ")}.`,
  };
}

/**
 * Presence of a single fiche string on the artwork.
 *
 * `couvertParProposition` : sur les points où le BAT sait proposer la valeur
 * manquante, le module des propositions rend déjà un constat qui dit la même
 * chose en mieux — il nomme la valeur lue. Émettre les deux met deux phrases
 * sur la même ligne de Marie, dont une qui n'apprend rien.
 */
function checkPresence(
  batN: string,
  value: string | null | undefined,
  cfg: {
    id: string;
    checklistId?: string;
    rubrique: string;
    libelle: string;
    absent: string;
    couvertParProposition?: true;
  }
): BatTextCheck | null {
  const { couvertParProposition, ...reste } = cfg;
  const base = { ...reste, origine: "texte" as const };
  if (!value || value.trim() === "") {
    if (couvertParProposition) return null;
    return { ...base, statut: "WARNING", justification: "Donnée absente de la fiche — non vérifiable." };
  }
  if (batN.includes(normCmp(value))) {
    return { ...base, statut: "PASS", justification: `« ${value.trim()} » présent sur le BAT.` };
  }
  return { ...base, statut: "WARNING", justification: cfg.absent };
}

/** Presence of every invariant token of a mandatory JDG mention. */
function checkTokens(
  batN: string,
  tokens: readonly string[],
  cfg: { id: string; checklistId?: string; rubrique: string; libelle: string; absent: string }
): BatTextCheck {
  const base = { ...cfg, origine: "texte" as const };
  if (tokens.every((t) => batN.includes(t))) {
    return { ...base, statut: "PASS", justification: "Mention présente sur le BAT." };
  }
  return { ...base, statut: "WARNING", justification: cfg.absent };
}

/**
 * Deux contrôles restent volontairement NON rattachés à la checklist :
 *
 *   - `TXT_INGREDIENTS` compare la liste imprimée au texte de la fiche. Le point
 *     2.2, lui, porte sur l'ORDRE pondéral décroissant. Les rattacher ferait
 *     échouer 2.2 sur presque chaque produit, puisque la réglementation impose
 *     que recette et étiquette diffèrent (dénomination légale contre référence
 *     matière, arrondis QUID, regroupement des arômes).
 *   - `TXT_DENOMINATION` vérifie que le NOM COMMERCIAL est imprimé ; le point
 *     1.0 juge la DÉNOMINATION LÉGALE. Le §1 interdit d'ailleurs que l'un tienne
 *     lieu de l'autre — c'est un contrôle qui manque encore au registre.
 *
 * Ils restent affichés dans le panneau BAT. Un rattachement approximatif vaut
 * moins qu'aucun rattachement : il produit un verdict faux sous une référence
 * réglementaire, ce qui est pire que de ne rien dire.
 */

/** Runs the deterministic text robot over the concatenated BAT text. */
export function runTextRobot(batText: string, input: BatTextInput): BatTextCheck[] {
  const batN = normCmp(batText);
  const results: (BatTextCheck | null)[] = [
    checkIngredients(batN, input),
    checkPresence(batN, input.denomination, {
      id: "TXT_DENOMINATION", checklistId: "1.5", rubrique: "Dénomination",
      libelle: "Dénomination de la fiche imprimée à l'identique sur le BAT ?",
      absent: "Dénomination de la fiche non retrouvée à l'identique sur les faces analysées. Le §1 interdit qu'un nom commercial tienne lieu de dénomination de la denrée.",
    }),
    checkPresence(batN, input.poidsNet, {
      id: "TXT_POIDS_NET", checklistId: "6.1", rubrique: "Quantité nette", libelle: "Poids net présent sur le BAT ?",
      absent: "Poids net non retrouvé sur les faces analysées — à vérifier.",
      couvertParProposition: true,
    }),
    checkPresence(batN, input.codeEtiquette, {
      id: "TXT_CODE_ETIQUETTE", checklistId: "15.1", rubrique: "Code étiquette", libelle: "Code étiquette présent sur le BAT ?",
      absent: "Code étiquette non retrouvé sur les faces analysées — à vérifier.",
      couvertParProposition: true,
    }),
    checkTokens(batN, CONSERVATION_TOKENS, {
      id: "TXT_CONSERVATION", checklistId: "7.2", rubrique: "Conservation", libelle: "Mention de conservation présente sur le BAT ?",
      absent: "Mention de conservation JDG non retrouvée sur les faces analysées — à vérifier.",
    }),
    checkTokens(batN, FABRICANT_JDG_TOKENS, {
      id: "TXT_FABRICANT", checklistId: "9.1", rubrique: "Fabricant", libelle: "Adresse fabricant présente sur le BAT ?",
      absent: "Adresse fabricant JDG non retrouvée sur les faces analysées — à vérifier.",
    }),
  ];

  // The allegation is deliberately NOT a deterministic check: its wording on the
  // label differs from the fiche libellé (fiche "Tonifiant / vitalité" vs label
  // "STIMULANT & TONIQUE" + "Consommation journalière… 3 tasses"). Exact match
  // produces false warnings — judging that equivalence is the LLM's job, and the
  // graphic emphasis the visual robot's. Handled in a later lot (input.allegation
  // is kept for them).
  // §3.1 : sans liste d'ingrédients sur l'étiquette, l'allergène se déclare par
  // « contient … ». Le cas existe : un mono-ingrédient omet légitimement sa
  // liste (§2.1), et l'allergène doit alors être annoncé autrement.
  if (declares(input.allergenes) && !batN.includes("ingredient")) {
    results.push(
      checkTokens(batN, ["contient"], {
        id: "TXT_ALLERGENE_CONTIENT", checklistId: "5.1", rubrique: "Particularités",
        libelle: "Allergène annoncé par « contient … » en l'absence de liste d'ingrédients ?",
        absent: "Aucune liste d'ingrédients sur le BAT et aucune mention « contient » — le §3.1 impose l'une ou l'autre.",
      })
    );
  }

  if (declares(input.allergenes)) {
    results.push(checkPresence(batN, input.allergenes, {
      id: "TXT_ALLERGENES", checklistId: "5.1", rubrique: "Particularités", libelle: "Allergènes déclarés présents sur le BAT ?",
      absent: "Allergène déclaré sur la fiche mais non retrouvé sur le BAT — à vérifier.",
    }));
  }

  // Les mentions conditionnelles. Les chercher sur tous les produits remplirait
  // la liste de Marie d'« absent » sur des produits que la mention ne concerne
  // pas — et une liste où tout est orange ne se lit plus.
  // §5 : « il est important d'envisager les 2 situations : avant et après
  // l'ouverture de l'emballage ». La mention JDG n'en distingue aucune — le
  // constat le dit, il ne condamne pas.
  results.push(
    checkTokens(batN, ["apres ouverture"], {
      id: "TXT_CONSERVATION_OUVERTURE", checklistId: "7.2", rubrique: "Conservation",
      libelle: "Conservation après ouverture précisée sur le BAT ?",
      absent: "Aucune mention distinguant la conservation APRÈS ouverture — le §5 demande d'envisager les deux situations.",
    })
  );

  if (contientReglisse(input.ingredients)) {
    results.push(checkTokens(batN, REGLISSE_TOKENS, {
      id: "TXT_REGLISSE", checklistId: "5.3", rubrique: "Particularités",
      libelle: "Avertissement réglisse / hypertension présent sur le BAT ?",
      absent: "Réglisse dans la composition, mais l'avertissement hypertension n'a pas été retrouvé sur les faces analysées.",
    }));
  }

  if (declares(input.allegation)) {
    for (const m of MENTIONS_ALLEGATION) {
      results.push(checkTokens(batN, m.tokens, {
        id: m.id, checklistId: "5.2", rubrique: "Particularités", libelle: m.libelle, absent: m.absent,
      }));
    }
  }

  if (revendiqueWfto(input.phraseWfto)) {
    results.push(checkWfto(batN));
  }

  return results.filter((c): c is BatTextCheck => c !== null);
}
