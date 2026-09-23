/**
 * Builds the import plan from the read rows and the current catalogue. Pure:
 * the same inputs give the same plan, which the report shows and — only after
 * review — the apply step executes.
 */
import { cleComparaison, fusionner } from "./fusion";
import type { Ancetre } from "./ancetre-seed";
import type { ResolveurGammes } from "./gammes";
import { FORMAT_CODE_PF } from "./ligne-jdg";
import type { LigneJdgLue, ResultatLigne } from "./ligne-jdg";
import type { Anomalie, ChampsFiche, ChampsProduitResolus, DecisionChamp, Valeur } from "./types";

/** Products the March seed created; only they have a known ancestor. */
export const DATE_SEED = "2026-03-05";

export const CHAMPS_PRODUIT = [
  "denominationFr", "denominationEn", "sousDesignationFr", "sousDesignationEn", "typeTheFr", "typeTheEn",
  "origine", "producteurJardin", "estAromatise", "codeEan", "poidsNet", "tempsInfusion", "tempInfusion",
  "poidsTasse", "nbTasses", "plusieursInfusions", "mentionEcocert", "labelsClient", "gammeId", "sousGammeId",
] as const satisfies readonly (keyof ChampsProduitResolus)[];

export const CHAMPS_FICHE = [
  "denominationLegale", "texteCommercialFr", "texteCommercialCourtFr", "texteCommercialEn", "ingredientsFr",
  "ingredientsEn", "allergenes", "allegationsSanteFr", "allegationsSanteEn", "phraseWftoFr", "statutWfto",
  "phraseEngagesFr", "sousDesignationDe", "ingredientsDe", "sousDesignationIt", "ingredientsIt",
  "sousDesignationNl", "ingredientsNl", "refFacing", "refContre", "codeEtiquette",
] as const satisfies readonly (keyof ChampsFiche)[];

export interface ProduitExistant extends ChampsProduitResolus {
  id: string;
  codePf: string;
  archive: boolean;
  /** YYYY-MM-DD */
  creeLe: string;
}

export interface FicheExistante extends ChampsFiche {
  id: string;
  produitId: string;
}

export interface EtatCatalogue {
  produits: readonly ProduitExistant[];
  fiches: readonly FicheExistante[];
}

export interface Creation {
  numeroLigne: number;
  codePf: string;
  produit: ChampsProduitResolus;
  fiche: ChampsFiche;
}

export interface MiseAJour {
  numeroLigne: number;
  codePf: string;
  produitId: string;
  ficheId: string | null;
  /** Why the label-sheet fields are left alone, when they are. */
  ficheIgnoree: string | null;
  decisionsProduit: DecisionChamp[];
  decisionsFiche: DecisionChamp[];
}

export interface MisDeCote {
  codePf: string;
  lignes: number[];
  motif: string;
}

export interface LibelleInconnu {
  type: "gamme" | "sous-gamme";
  libelle: string;
  gamme: string | null;
  motif: string;
  lignes: number;
}

export interface Plan {
  creations: Creation[];
  misesAJour: MiseAJour[];
  misDeCote: MisDeCote[];
  anomalies: Anomalie[];
  /** Blocking: the plan cannot be applied while this is not empty. */
  libellesInconnus: LibelleInconnu[];
  absentsDeLExcel: string[];
}

/** Fields whose parsed value differs between duplicated rows of one code. */
function champsDivergents(lignes: readonly LigneJdgLue[]): string[] {
  const [premiere, ...autres] = lignes;
  const tous = { ...premiere.produit, ...premiere.fiche, gamme: premiere.gamme, sousGamme: premiere.sousGamme };
  return Object.keys(tous).filter((champ) =>
    autres.some((l) => {
      const autre: Record<string, unknown> = { ...l.produit, ...l.fiche, gamme: l.gamme, sousGamme: l.sousGamme };
      const valeur = (o: Record<string, unknown>) => cleComparaison(o[champ] as Valeur);
      return valeur(autre) !== valeur(tous);
    }),
  );
}

function trierLignes(resultats: readonly ResultatLigne[], misDeCote: MisDeCote[]): LigneJdgLue[] {
  const valides: LigneJdgLue[] = [];
  for (const r of resultats) {
    if (!r.ok) misDeCote.push({ codePf: r.codePf, lignes: [r.numeroLigne], motif: r.motif });
    else if (!FORMAT_CODE_PF.test(r.ligne.codePf)) {
      misDeCote.push({ codePf: r.ligne.codePf, lignes: [r.ligne.numeroLigne], motif: "code produit hors format" });
    } else valides.push(r.ligne);
  }
  const parCode = new Map<string, LigneJdgLue[]>();
  for (const l of valides) parCode.set(l.codePf, [...(parCode.get(l.codePf) ?? []), l]);
  const uniques: LigneJdgLue[] = [];
  for (const [codePf, lignes] of parCode) {
    if (lignes.length === 1) uniques.push(lignes[0]);
    else {
      misDeCote.push({
        codePf,
        lignes: lignes.map((l) => l.numeroLigne),
        motif: `code en double, diffère sur : ${champsDivergents(lignes).join(", ") || "rien"}`,
      });
    }
  }
  return uniques;
}

export function construirePlan(
  resultats: readonly ResultatLigne[],
  ancetres: ReadonlyMap<string, Ancetre>,
  etat: EtatCatalogue,
  resoudre: ResolveurGammes,
): Plan {
  const plan: Plan = { creations: [], misesAJour: [], misDeCote: [], anomalies: [], libellesInconnus: [], absentsDeLExcel: [] };
  const lignes = trierLignes(resultats, plan.misDeCote);
  const actifs = new Map(etat.produits.filter((p) => !p.archive).map((p) => [p.codePf, p]));
  const archives = new Set(etat.produits.filter((p) => p.archive).map((p) => p.codePf));
  const inconnus = new Map<string, LibelleInconnu>();

  for (const ligne of lignes) {
    plan.anomalies.push(...ligne.anomalies);
    const resolution = resoudre(ligne.gamme, ligne.sousGamme);
    if (!resolution.ok && resolution.motif === "vide") {
      plan.misDeCote.push({ codePf: ligne.codePf, lignes: [ligne.numeroLigne], motif: "gamme vide" });
      continue;
    }
    if (!resolution.ok) {
      const cle = `${resolution.type}|${resolution.gamme}|${resolution.libelle}`;
      const connu = inconnus.get(cle) ?? { type: resolution.type, libelle: resolution.libelle, gamme: resolution.gamme, motif: resolution.motif, lignes: 0 };
      connu.lignes += 1;
      inconnus.set(cle, connu);
      continue;
    }
    const produit: ChampsProduitResolus = { ...ligne.produit, gammeId: resolution.gammeId, sousGammeId: resolution.sousGammeId };
    const existant = actifs.get(ligne.codePf);
    if (existant === undefined) {
      if (archives.has(ligne.codePf)) {
        plan.misDeCote.push({ codePf: ligne.codePf, lignes: [ligne.numeroLigne], motif: "code seulement archivé en base (question 4 de la spec)" });
      } else plan.creations.push({ numeroLigne: ligne.numeroLigne, codePf: ligne.codePf, produit, fiche: ligne.fiche });
      continue;
    }
    plan.misesAJour.push(planifierMiseAJour(ligne, produit, existant, etat, ancetres, resoudre));
  }

  // Present in the workbook at all, even if set aside: not "absent".
  const vus = new Set(resultats.map((r) => (r.ok ? r.ligne.codePf : r.codePf)));
  plan.absentsDeLExcel = [...actifs.keys()].filter((code) => !vus.has(code)).sort();
  plan.libellesInconnus = [...inconnus.values()].sort((a, b) => b.lignes - a.lignes);
  neutraliserCodesEtiquettePartages(plan, etat);
  return plan;
}

function planifierMiseAJour(
  ligne: LigneJdgLue,
  produit: ChampsProduitResolus,
  existant: ProduitExistant,
  etat: EtatCatalogue,
  ancetres: ReadonlyMap<string, Ancetre>,
  resoudre: ResolveurGammes,
): MiseAJour {
  const brut = existant.creeLe === DATE_SEED ? ancetres.get(existant.codePf) : undefined;
  const gammeAncetre = brut ? resoudre(brut.gamme, brut.sousGamme) : null;
  const ancetreProduit: Partial<ChampsProduitResolus> | undefined = brut && {
    ...brut.produit,
    gammeId: gammeAncetre?.ok ? gammeAncetre.gammeId : undefined,
    sousGammeId: gammeAncetre?.ok ? gammeAncetre.sousGammeId : undefined,
  };
  const fiches = etat.fiches.filter((f) => f.produitId === existant.id);
  const fiche = fiches.length === 1 ? fiches[0] : null;
  return {
    numeroLigne: ligne.numeroLigne,
    codePf: ligne.codePf,
    produitId: existant.id,
    ficheId: fiche?.id ?? null,
    ficheIgnoree: fiche ? null : `${fiches.length} fiche(s) sur ce produit`,
    decisionsProduit: fusionner(CHAMPS_PRODUIT, ancetreProduit, existant, produit),
    decisionsFiche: fiche ? fusionner(CHAMPS_FICHE, brut?.fiche, fiche, ligne.fiche) : [],
  };
}

/**
 * `code_etiquette` is unique across the catalogue. A code proposed twice in the
 * workbook, or already held by another fiche, is not written anywhere.
 */
function neutraliserCodesEtiquettePartages(plan: Plan, etat: EtatCatalogue): void {
  const proposes = new Map<string, number>();
  const compter = (code: string | null) => code && proposes.set(code, (proposes.get(code) ?? 0) + 1);
  plan.creations.forEach((c) => compter(c.fiche.codeEtiquette));
  const aPrendre = (m: MiseAJour) => m.decisionsFiche.find((d) => d.champ === "codeEtiquette" && d.decision === "prendre");
  plan.misesAJour.forEach((m) => compter((aPrendre(m)?.excel as string | null) ?? null));
  const detenus = new Map(etat.fiches.filter((f) => f.codeEtiquette).map((f) => [f.codeEtiquette as string, f.id]));
  const bloque = (code: string | null, ficheId: string | null) =>
    code !== null && ((proposes.get(code) ?? 0) > 1 || (detenus.has(code) && detenus.get(code) !== ficheId));

  for (const c of plan.creations) {
    if (!bloque(c.fiche.codeEtiquette, null)) continue;
    plan.anomalies.push({ codePf: c.codePf, colonne: "code étiquette", valeur: c.fiche.codeEtiquette ?? "", motif: "code étiquette partagé avec un autre produit, non écrit" });
    c.fiche = { ...c.fiche, codeEtiquette: null };
  }
  for (const m of plan.misesAJour) {
    const decision = aPrendre(m);
    if (!decision || !bloque(decision.excel as string, m.ficheId)) continue;
    plan.anomalies.push({ codePf: m.codePf, colonne: "code étiquette", valeur: String(decision.excel), motif: "code étiquette partagé avec un autre produit, non écrit" });
    decision.decision = "conflit";
  }
}

