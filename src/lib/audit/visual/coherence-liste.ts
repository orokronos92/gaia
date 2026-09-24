/**
 * Point 2.5 when there is no recette étiquette: the fiche's ingredient list —
 * for older products the catalogue workbook's, the only record there is — face
 * to face with the list printed on the BAT (comparaison-liste.ts).
 *
 * Only the differences reach the card, each with what the fiche says and what
 * the label prints: Quality sees the problem and can settle it, arbitrate it,
 * or go and ask, without reading the lines that match.
 */
import { comparerListes, decrireEcart, listeImprimee, type EcartListe } from "./comparaison-liste";
import { elementsListe } from "./elements-liste";
import { motsSitues, normCmp, type MotSitue } from "./mesure-mentions";
import { repereMot, type RepereBat } from "./reperes";
import type { BatTextCheck } from "./text-robot";
import type { AnalyseBat } from "@/lib/utils/pdf-bat";

/** Where the fiche's list comes from, as Quality names it. */
export const SOURCE_LISTE = {
  recette: "recette étiquette",
  excel: "liste de la base étiquettes (Excel)",
} as const;
export type SourceListe = keyof typeof SOURCE_LISTE;

export interface ComparaisonListe {
  source: string;
  /** Which list was compared — the card offers to correct the workbook one in place. */
  sourceCle: SourceListe;
  /** The fiche's list as stored, to prefill the correction. */
  texteFiche: string;
  /** Items of the fiche's list, for "3 identical out of 4". */
  total: number;
  ecarts: EcartListe[];
}

const REPERES_MAX = 6;
const LONGUEUR_SIGNIFIANTE = 4;

/** The rarest meaningful word of an item on the BAT: the one that points to it. */
function motRepere(texte: string, mots: MotSitue[]): MotSitue | undefined {
  const noyau = (t: string) => normCmp(t).replace(/^[,.;:()*]+|[,.;:()*]+$/g, "");
  const candidats = normCmp(texte)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((m) => m.length >= LONGUEUR_SIGNIFIANTE);
  const occurrences = candidats
    .map((c) => ({ c, trouves: mots.filter((m) => noyau(m.mot.texte) === c) }))
    .filter((o) => o.trouves.length > 0)
    .sort((a, b) => a.trouves.length - b.trouves.length);
  return occurrences[0]?.trouves[0];
}

function reperesDesEcarts(ecarts: EcartListe[], analyses: AnalyseBat[]): RepereBat[] {
  const mots = motsSitues(analyses);
  const reperes: RepereBat[] = [];
  for (const e of ecarts) {
    const imprime = e.type === "different" || e.type === "en_plus" ? e.etiquette : e.type === "ordre" ? e.element : null;
    if (imprime === null || reperes.length >= REPERES_MAX) continue;
    const m = motRepere(imprime, mots);
    if (m) reperes.push(repereMot(m.mot, m.page, m.face, imprime));
  }
  return reperes;
}

export function controlerListeFiche(
  analyses: AnalyseBat[],
  texteBat: string,
  liste: string,
  source: SourceListe,
  base: Pick<BatTextCheck, "id" | "origine" | "rubrique" | "libelle" | "checklistId">
): BatTextCheck {
  const nomSource = SOURCE_LISTE[source];
  const fiche = elementsListe(liste);
  const imprimee = listeImprimee(texteBat);
  if (imprimee === null) {
    return {
      ...base,
      statut: "WARNING",
      justification: `La liste d'ingrédients ne se lit pas en texte sur le BAT (texte vectorisé, ou face des ingrédients absente) : à comparer à l'œil avec la ${nomSource}.`,
    };
  }

  const ecarts = comparerListes(fiche.elements, imprimee);
  const secondeListe = fiche.autreListeIgnoree ? " La fiche porte une seconde liste après la première : seule la première est comparée." : "";
  if (ecarts.length === 0) {
    return {
      ...base,
      statut: "PASS",
      justification: `Les ${fiche.elements.length} ingrédients de la ${nomSource} se lisent à l'identique, dans le même ordre, sur le BAT.${secondeListe}`,
    };
  }
  return {
    ...base,
    statut: "FAIL",
    // Spelled out in full: the justification is what Quality's decision is
    // pinned to, so a different divergence reopens a closed point.
    justification: `Comparée à la ${nomSource} : ${ecarts.map(decrireEcart).join(" ; ")}.${secondeListe}`,
    comparaisonListe: { source: nomSource, sourceCle: source, texteFiche: liste, total: fiche.elements.length, ecarts },
    reperes: reperesDesEcarts(ecarts, analyses),
  };
}
