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
import {
  DEMETER_PHRASE_TYPE,
  mentionDue,
  phraseSaisie,
  type StatutMention,
} from "../statut-mention";
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
  /** Product launch date as the fiche holds it (free text), for the "nouveauté" limit. */
  dateMiseMarche?: string | null;
  /** Today — injected by tests; defaults to the real date. */
  aujourdhui?: Date;
  /** Where `ingredients` comes from — the recette étiquette or the workbook. */
  sourceListe?: import("./coherence-liste").SourceListe | null;
  allegation?: string | null;
  allergenes?: string | null;
  poidsNet?: string | null;
  codeEtiquette?: string | null;
  mentionConservation?: string | null;
  mentionFabricant?: string | null;
  /** Champ « Mention WFTO » de la fiche — sert de drapeau, pas de référence. */
  phraseWfto?: string | null;
  /**
   * La gamme du produit — la DÉDUCTION quand la mention est laissée en `AUTO`.
   * Ce n'est plus elle qui décide : c'est le statut que la Qualité a posé.
   */
  gamme?: string | null;
  /** Ce que la gamme du produit impose — lu dans le référentiel, pas deviné. */
  exigeMentionAnemos?: boolean;
  exigeMentionEngages?: boolean;
  /** Au moins un ingrédient certifié Demeter dans la recette courante (§11.1). */
  estDemeter?: boolean;
  phraseDemeter?: string | null;
  phraseAnemos?: string | null;
  phraseEngages?: string | null;
  /** Ce que la Qualité a décidé pour chaque mention — `AUTO` par défaut. */
  statutWfto?: StatutMention | null;
  statutDemeter?: StatutMention | null;
  statutAnemos?: StatutMention | null;
  statutEngages?: StatutMention | null;
}

export interface BatTextCheck {
  id: string;
  rubrique: string;
  libelle: string;
  statut: ControlStatus;
  justification: string;
  /**
   * Point de la checklist auquel ce contrôle répond (PRO-QHS-313).
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
   * La décision de la Qualité sur ce constat, quand il n'a pas de point du
   * registre pour la porter. Sans elle, une anomalie hors checklist restait
   * dans la liste de travail même une fois regardée et assumée.
   */
  validation?: import("../validation").EtatValidation;
  /**
   * Ce qu'il reste à faire dessus. Les compteurs de tête d'écran se comptent
   * là-dessus : sans action, un constat hors registre était compté comme fait
   * alors qu'il attendait un regard, et « tout est vérifié » ne voulait rien
   * dire tant qu'il restait des constats ouverts en bas de page.
   */
  action?: import("../types").ControlAction;
  /**
   * Où regarder sur le BAT. Un contrôle qui mesure sait où il a mesuré ; le
   * dire épargne à Marie de chercher le texte dont il parle.
   */
  reperes?: import("./reperes").RepereBat[];
  /** The fiche's list face to face with the printed one — only what diverges. */
  comparaisonListe?: import("./coherence-liste").ComparaisonListe;
  /** Measured against required (14.1, 6.2, 13.1) — only what diverges. */
  faceAFace?: import("./face-a-face").FaceAFace;
}

/**
 * §11.2 — les mentions de gamme, sur le modèle exact de WFTO.
 *
 * JDG a dix gammes et plusieurs portent leur mention volontaire. Deux d'entre
 * elles s'imprimaient sans qu'aucun contrôle ne les regarde :
 *
 *   - **Anemos** (thé transporté à la voile) — 3 références. Le mot « Anemos »
 *     n'apparaît nulle part sur l'étiquette : ce qui s'imprime, c'est le bandeau
 *     « THÉ TRANSPORTÉ À LA VOILE » et la phrase du transporteur. Chercher
 *     « anemos » sur le BAT ne trouverait rien — c'est le nom du label côté
 *     TOWT, pas le texte de l'emballage.
 *   - **Les Engagés** — 11 références, trois sous-gammes. Le texte de
 *     l'association change à chaque produit ; ce qui ne change pas, c'est le
 *     bandeau « AGIR POUR … » et la ligne de don « 0,50 € REVERSÉS À … ». Ce
 *     sont eux qu'on mesure, pas le descriptif.
 *
 * Deux marqueurs plutôt qu'un verdict, comme pour WFTO : la revendication (ce
 * qui annonce la gamme au consommateur) et la phrase qui doit l'accompagner.
 * Séparés, ils disent LEQUEL des deux manque — et c'est presque toujours le
 * second qui manque, jamais le premier.
 */
interface MentionGamme {
  id: string;
  checklistId: string;
  libelle: string;
  /** Ce qui annonce la gamme sur l'étiquette. */
  revendication: readonly string[];
  /** La phrase que le §11.2 impose d'imprimer avec elle. */
  phrase: readonly string[];
  /** Comment la nommer dans un constat. */
  nomRevendication: string;
  nomPhrase: string;
  /** Le champ de fiche correspondant, pour le signaler s'il est vide. */
  champFiche: string;
}

const MENTION_ANEMOS: MentionGamme = {
  id: "TXT_ANEMOS",
  checklistId: "13.5",
  libelle: "Mention « transporté à la voile » complète sur le BAT ?",
  revendication: ["transporte a la voile"],
  phrase: ["changeons de cap"],
  nomRevendication: "le bandeau « THÉ TRANSPORTÉ À LA VOILE »",
  nomPhrase: "la phrase du transporteur (« …Ensemble, changeons de cap ! »)",
  champFiche: "la mention Anemos",
};

const MENTION_ENGAGES: MentionGamme = {
  id: "TXT_ENGAGES",
  checklistId: "13.6",
  libelle: "Mention « Les Engagés » complète sur le BAT ?",
  revendication: ["agir pour"],
  phrase: ["reverses a"],
  nomRevendication: "le bandeau « AGIR POUR … »",
  nomPhrase: "la ligne de don (« 0,50 € REVERSÉS À … »)",
  champFiche: "la mention Les Engagés",
};

function checkMentionGamme(
  batN: string,
  m: MentionGamme,
  phraseFiche: string | null | undefined
): BatTextCheck {
  const base = {
    id: m.id,
    origine: "texte" as const,
    checklistId: m.checklistId,
    rubrique: "Labels",
    libelle: m.libelle,
  };
  const revendique = m.revendication.every((t) => batN.includes(t));
  const accompagnee = m.phrase.every((t) => batN.includes(t));

  if (revendique && accompagnee) {
    // Le BAT porte tout ; si la fiche, elle, est muette, c'est elle qu'il reste
    // à compléter — et le dire ainsi évite de faire passer pour un doute sur
    // l'étiquette ce qui n'est qu'une case vide chez nous.
    return {
      ...base,
      statut: phraseSaisie(phraseFiche) ? "PASS" : "WARNING",
      justification: phraseSaisie(phraseFiche)
        ? `${m.nomRevendication} et ${m.nomPhrase} sont présents sur le BAT.`
        : `${m.nomRevendication} et ${m.nomPhrase} sont présents sur le BAT, mais ${m.champFiche} n'est pas renseignée sur la fiche.`,
      ...(phraseSaisie(phraseFiche) ? {} : { manqueSurLaFiche: m.champFiche }),
    };
  }
  if (revendique) {
    return {
      ...base,
      statut: "WARNING",
      justification: `${m.nomRevendication} est imprimé, mais ${m.nomPhrase} n'a pas été retrouvé sur les faces analysées — le §11.2 impose les deux ensemble.`,
    };
  }
  return {
    ...base,
    statut: "WARNING",
    justification: accompagnee
      ? `${m.nomPhrase} est imprimé, mais ${m.nomRevendication} n'a pas été retrouvé sur les faces analysées.`
      : `Produit de cette gamme, mais ni ${m.nomRevendication} ni ${m.nomPhrase} n'ont été retrouvés sur les faces analysées.`,
  };
}

/**
 * §11.1 — la note ** qui accompagne un ingrédient Demeter.
 *
 * Le déclencheur n'est pas l'étiquette mais la RECETTE : dès qu'une ligne porte
 * la certification, la note devient obligatoire. Elle est due au mot près :
 * « demeter est LE LABEL des produits issus de l'agriculture biodynamique »,
 * texte du cahier des charges Demeter France 2025 (§4.3.1) et de PRO-QHS-313 v2
 * §2.1. L'encadré du §11.1 porte encore une ancienne formulation (« la marque…
 * certifiée ») : le contrôle l'exigeait, et signalait à tort les 14 BAT qui
 * impriment la bonne, dont TA6212 « Jardin sous la lune » (décision 2026-09-24).
 *
 * D'où deux marqueurs séparés : la note existe-t-elle, et est-elle dans les
 * termes. Un contrôle qui n'aurait cherché que la phrase entière aurait répondu
 * « absente » — et personne n'aurait vu qu'elle est là, à deux mots près.
 */
const DEMETER_NOTE = "biologique et biodynamique";
const DEMETER_TERMES = "demeter est le label des produits issus";

/** La fiche n'a pas la mention : on lui propose celle de la procédure. */
const propositionDemeter = () =>
  ({
    table: "fiche",
    champ: "phraseDemeterFr",
    valeur: DEMETER_PHRASE_TYPE,
    source: "PRO-QHS-313 §2.1 ; cahier des charges Demeter France §4.3.1",
  }) as const;

function checkDemeter(batN: string, phraseFiche: string | null | undefined): BatTextCheck {
  const base = {
    id: "TXT_DEMETER",
    origine: "texte" as const,
    checklistId: "2.4",
    rubrique: "Labels",
    libelle: "Note ** Demeter imprimée dans les termes du cahier des charges Demeter ?",
  };
  const note = batN.includes(DEMETER_NOTE);
  const termes = batN.includes(DEMETER_TERMES);

  if (note && termes) {
    return {
      ...base,
      statut: phraseSaisie(phraseFiche) ? "PASS" : "WARNING",
      justification: phraseSaisie(phraseFiche)
        ? "Note ** Demeter présente sur le BAT, dans les termes du cahier des charges Demeter."
        : "Note ** Demeter présente sur le BAT, mais la mention Demeter n'est pas renseignée sur la fiche.",
      ...(phraseSaisie(phraseFiche)
        ? {}
        : { manqueSurLaFiche: "la mention Demeter", proposition: propositionDemeter() }),
    };
  }
  // La fiche doit porter le texte même quand le BAT ne l'imprime pas — c'est
  // elle qui dit au graphisme ce qu'il faut imprimer, pas l'inverse.
  const manque = phraseSaisie(phraseFiche)
    ? {}
    : { manqueSurLaFiche: "la mention Demeter", proposition: propositionDemeter() };

  if (note) {
    return {
      ...base,
      statut: "WARNING",
      justification: `La note ** est imprimée, mais pas dans les termes du cahier des charges Demeter : « ${DEMETER_PHRASE_TYPE} ».`,
      ...manque,
    };
  }
  return {
    ...base,
    statut: "WARNING",
    justification:
      "Ingrédient certifié Demeter dans la recette, mais la note ** correspondante n'a pas été retrouvée sur les faces analysées.",
    ...manque,
  };
}

/** Normalize for comparison: fold case/accents/space AND glue number+unit. */
/** Curly apostrophes: the workbook mixes ’ and ', the artwork too. */
function normCmp(value: string): string {
  return normalize(value).replace(/[’‘]/g, "'").replace(/(\d)\s*(g|kg|mg|ml|cl|%)/gi, "$1$2");
}

function declares(value?: string | null): boolean {
  if (!value) return false;
  const n = normalize(value);
  return n !== "" && n !== "non" && n !== "aucun" && n !== "aucune";
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

/**
 * §7 — l'adresse du fabricant.
 *
 * PRO-QHS-313 v2 précise que le nom et l'adresse « figurent sur les sachets
 * non-encollés » : ils sont imprimés sur le sachet, pas sur l'étiquette. Leur
 * absence du BAT est donc la règle, pas un écart — 5 BAT sur 139 la portent.
 * Le contrôle alertait sur les autres ; il dit maintenant où elle se trouve
 * (décision 2026-09-24).
 */
function checkFabricant(batN: string): BatTextCheck {
  const base = { id: "TXT_FABRICANT", origine: "texte" as const, checklistId: "9.1", rubrique: "Fabricant", libelle: "Adresse fabricant JDG" };
  return FABRICANT_JDG_TOKENS.every((t) => batN.includes(t))
    ? { ...base, statut: "PASS", justification: "Adresse fabricant JDG présente sur le BAT." }
    : { ...base, statut: "PASS", justification: "Adresse non imprimée sur l'étiquette : elle figure sur le sachet non encollé (PRO-QHS-313 §7)." };
}

/**
 * §11.2 — « nouveauté », « nouvelle recette » : six mois au plus.
 *
 * PRO-QHS-313 v2 applique la notion de nouveauté pendant 6 mois. La règle vise
 * la mention, pas le mot : « Nouvelle-Zélande » (TO1192) ou « de nouveaux
 * thés » (TO4162) ne comptent pas — sur les 394 BAT de 2026-09-24, aucun ne
 * porte la mention. Le contrôle ne parle que si elle apparaît.
 */
const MENTION_NOUVEAUTE = /\bnouveautes?\b|\bnouvelle recette\b|\bnouvelle formule\b/;
const DUREE_NOUVEAUTE_MOIS = 6;

/** A launch date written freely: 2026-03-15, 15/03/2026, 03/2026, 2026. */
export function lireDateLancement(texte: string | null | undefined): Date | null {
  const t = texte?.trim() ?? "";
  let m = t.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3] ?? 1));
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  m = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Number(m[2]), Number(m[1]) - 1, 1);
  m = t.match(/^(\d{4})$/);
  if (m) return new Date(Number(m[1]), 0, 1);
  return null;
}

function checkNouveaute(batN: string, input: BatTextInput): BatTextCheck | null {
  const mention = batN.match(MENTION_NOUVEAUTE);
  if (!mention) return null;
  const base = { id: "TXT_NOUVEAUTE", origine: "texte" as const, checklistId: "13.3", rubrique: "Labels", libelle: "Mention « nouveauté » de moins de 6 mois ?" };
  const lancement = lireDateLancement(input.dateMiseMarche);
  if (lancement === null) {
    return {
      ...base,
      statut: "WARNING",
      manqueSurLaFiche: "la date de mise en marché",
      justification: `Mention « ${mention[0]} » sur le BAT : limitée à ${DUREE_NOUVEAUTE_MOIS} mois après le lancement (PRO-QHS-313 §11.2), et la fiche ne donne pas de date de mise en marché.`,
    };
  }
  const limite = new Date(lancement);
  limite.setMonth(limite.getMonth() + DUREE_NOUVEAUTE_MOIS);
  const aujourdhui = input.aujourdhui ?? new Date();
  const date = lancement.toLocaleDateString("fr-FR");
  return aujourdhui <= limite
    ? { ...base, statut: "PASS", justification: `Mention « ${mention[0]} » : produit lancé le ${date}, moins de ${DUREE_NOUVEAUTE_MOIS} mois.` }
    : { ...base, statut: "FAIL", justification: `Mention « ${mention[0]} » sur le BAT, produit lancé le ${date} : plus de ${DUREE_NOUVEAUTE_MOIS} mois (PRO-QHS-313 §11.2).` };
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
 * The ingredient list is not compared here any more. `TXT_INGREDIENTS` looked
 * for each fiche item anywhere in the BAT text, outside the registry, while
 * point 2.5 asked the same question: two lines for one question on Marie's
 * screen. The comparison now lives in point 2.5, item by item, face to face
 * (coherence-etiquette.ts, coherence-liste.ts — decision 2026-09-24).
 */

/** Runs the deterministic text robot over the concatenated BAT text. */
export function runTextRobot(batText: string, input: BatTextInput): BatTextCheck[] {
  const batN = normCmp(batText);
  const results: (BatTextCheck | null)[] = [
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
    checkFabricant(batN),
    checkNouveaute(batN, input),
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

  // Les quatre mentions de gamme. Le statut décide, la donnée ne fait que
  // déduire : en `AUTO` on retombe sur la gamme du produit, la recette ou la
  // phrase déjà saisie, mais un `NON` de la Qualité éteint le contrôle et un
  // `OUI` l'allume, quoi que dise la base.
  if (mentionDue(input.statutWfto, phraseSaisie(input.phraseWfto))) {
    results.push(checkWfto(batN));
  }
  // La gamme dit elle-même ce qu'elle exige : le libellé n'est plus interrogé.
  if (mentionDue(input.statutAnemos, input.exigeMentionAnemos === true || phraseSaisie(input.phraseAnemos))) {
    results.push(checkMentionGamme(batN, MENTION_ANEMOS, input.phraseAnemos));
  }
  if (mentionDue(input.statutEngages, input.exigeMentionEngages === true || phraseSaisie(input.phraseEngages))) {
    results.push(checkMentionGamme(batN, MENTION_ENGAGES, input.phraseEngages));
  }
  if (mentionDue(input.statutDemeter, input.estDemeter === true || phraseSaisie(input.phraseDemeter))) {
    results.push(checkDemeter(batN, input.phraseDemeter));
  }

  return results.filter((c): c is BatTextCheck => c !== null);
}
