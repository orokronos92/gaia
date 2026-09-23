/**
 * The sheets that create products besides JDG, each its own catalogue (migration
 * 0030): Terra Madre and the two infusette sheets. One reader, one map per sheet; the rows it gives
 * go through the same validation and plan as the JDG sheet.
 * Mapping: docs/decisions/2026-09-23-mapping-exhaustif-bdd-v2.md §3–4.
 */
import { indexerColonnes, texte, texteOuAbsent } from "./cellules";
import type { Cellule, Ligne } from "./cellules";
import { dateExcel } from "./complements-jdg";
import { FicheSchema, lirePhraseWfto, ProduitSchema, REFERENCE_ETIQUETTE, valider } from "./ligne-jdg";
import type { ResultatLigne } from "./ligne-jdg";
import type { Anomalie, ChampsFiche, ChampsProduit } from "./types";

type Lecture = "texte" | "absent" | "oui" | "date";
type Extra = readonly [colonne: string, lecture: Lecture];

export interface CarteOnglet {
  onglet: string;
  catalogue: "TERRA_MADRE" | "INFUSETTES_PAGES" | "INFUSETTES_COUNTRY_FARM";
  formatCode: RegExp;
  gamme: { colonne: string } | { fixe: string };
  sousGamme: string | null;
  /** Terra Madre has no tea type: its range stands in (decision 3 of 2026-09-23). */
  typeThe: { colonne: string } | "gamme";
  produit: Partial<Record<keyof ChampsProduit, string>>;
  fiche: Partial<Record<keyof ChampsFiche, string>>;
  labels: readonly string[];
  phraseWfto: string;
  refFacing?: string;
  refContre?: string;
  extrasProduit: Record<string, Extra>;
  extrasFiche: Record<string, Extra>;
  suivi: Record<string, Extra>;
}

const LIBELLE_LABEL: Record<string, string> = { D: "Demeter" };
/** The IGP column of Terra Madre also carries AOP. */
const VALEURS_ACCEPTEES: Record<string, readonly string[]> = { IGP: ["IGP", "AOP"] };

export interface LigneOngletLue {
  resultat: ResultatLigne;
  extras: { produit: Record<string, string | boolean>; fiche: Record<string, string | boolean>; suivi: Record<string, string> };
}

function lire(cellule: Cellule, lecture: Lecture): string | boolean | null {
  if (lecture === "absent") return texteOuAbsent(cellule);
  if (lecture === "oui") return texte(cellule) === null ? null : /^oui$/i.test(texte(cellule) ?? "");
  if (lecture === "date") return dateExcel(cellule);
  return texte(cellule);
}

/** Every column a map names: all must exist, or the sheet is refused. */
function colonnesDe(carte: CarteOnglet): string[] {
  const noms = [
    "CODE PF", carte.phraseWfto, ...carte.labels, ...Object.values(carte.produit), ...Object.values(carte.fiche),
    ...[carte.extrasProduit, carte.extrasFiche, carte.suivi].flatMap((e) => Object.values(e).map(([c]) => c)),
  ];
  if ("colonne" in carte.gamme) noms.push(carte.gamme.colonne);
  if (typeof carte.typeThe === "object") noms.push(carte.typeThe.colonne);
  if (carte.refFacing) noms.push(carte.refFacing);
  if (carte.refContre) noms.push(carte.refContre);
  return [...new Set(noms)];
}

export function indexerOnglet(carte: CarteOnglet, entetes: Ligne): Record<string, number> {
  return indexerColonnes(entetes, colonnesDe(carte));
}

export function lireLigneOnglet(carte: CarteOnglet, ligne: Ligne, index: Record<string, number>, numeroLigne: number): LigneOngletLue {
  const cel = (colonne: string) => ligne[index[colonne]];
  const codePf = texte(cel("CODE PF")) ?? "";
  const anomalies: Anomalie[] = [];
  const gamme = "fixe" in carte.gamme ? carte.gamme.fixe : texte(cel(carte.gamme.colonne));

  const labels: string[] = [];
  for (const colonne of carte.labels) {
    const valeur = texteOuAbsent(cel(colonne))?.toUpperCase() ?? null;
    if (valeur === null) continue;
    if ((VALEURS_ACCEPTEES[colonne] ?? [colonne]).includes(valeur)) labels.push(colonne === valeur ? (LIBELLE_LABEL[colonne] ?? colonne) : valeur);
    else anomalies.push({ codePf, colonne, valeur, motif: "valeur qui n'est pas le label attendu, non importée" });
  }
  const reference = (colonne?: string) => {
    const valeur = colonne ? texte(cel(colonne))?.replace(/\s+/g, "").toUpperCase() ?? null : null;
    return valeur !== null && REFERENCE_ETIQUETTE.test(valeur) ? valeur : null;
  };
  const refFacing = reference(carte.refFacing);
  const refContre = reference(carte.refContre);

  const champsProduit = Object.fromEntries(Object.entries(carte.produit).map(([champ, colonne]) => [champ, texteOuAbsent(cel(colonne))]));
  const champsFiche = Object.fromEntries(Object.entries(carte.fiche).map(([champ, colonne]) => [champ, texteOuAbsent(cel(colonne))]));
  const produit = ProduitSchema.safeParse({
    denominationEn: null, sousDesignationFr: null, sousDesignationEn: null, typeTheEn: null, origine: null,
    producteurJardin: null, codeEan: null, poidsNet: null, tempsInfusion: null, tempInfusion: null, poidsTasse: null,
    nbTasses: null, mentionEcocert: null, estAromatise: false, plusieursInfusions: false, conditionnement: null,
    ...champsProduit,
    denominationFr: champsProduit.denominationFr ?? "",
    typeTheFr: (carte.typeThe === "gamme" ? gamme : texte(cel(carte.typeThe.colonne))) ?? "",
    labelsClient: labels.length > 0 ? labels : null,
  });
  const fiche = FicheSchema.safeParse({
    denominationLegale: champsProduit.denominationFr ?? null, texteCommercialFr: null, texteCommercialCourtFr: null,
    texteCommercialEn: null, ingredientsFr: null, ingredientsEn: null, allergenes: null, allegationsSanteFr: null,
    allegationsSanteEn: null, phraseEngagesFr: null, sousDesignationDe: null, ingredientsDe: null, sousDesignationIt: null,
    ingredientsIt: null, sousDesignationNl: null, ingredientsNl: null,
    ...champsFiche,
    ...lirePhraseWfto(texte(cel(carte.phraseWfto))),
    refFacing, refContre, codeEtiquette: refContre ?? refFacing,
  });

  const lireExtras = (extras: Record<string, Extra>) =>
    Object.fromEntries(Object.entries(extras).map(([champ, [colonne, lecture]]) => [champ, lire(cel(colonne), lecture)]).filter(([, v]) => v !== null));
  return {
    resultat: valider({ numeroLigne, codePf, gamme, sousGamme: carte.sousGamme, anomalies }, produit, fiche),
    extras: {
      produit: lireExtras(carte.extrasProduit) as Record<string, string | boolean>,
      fiche: lireExtras(carte.extrasFiche) as Record<string, string | boolean>,
      suivi: lireExtras(carte.suivi) as Record<string, string>,
    },
  };
}
