/**
 * Retrouver une mention sur un BAT, et la mesurer.
 *
 * La difficulté n'est pas le calcul — c'est de savoir de quel mot on parle. Un
 * même mot figure dans la liste d'ingrédients et dans le texte marketing en
 * petit corps ; mesurer le mauvais produirait une non-conformité imaginaire.
 * D'où la fenêtre de lecture : on ne mesure que là où les mots d'une mention se
 * concentrent.
 */

import { normalize } from "../canonical";
import { hauteurXmm, type AnalyseBat, type MetriquePolice, type MotBat } from "@/lib/utils/pdf-bat";

/** Comparaison : casse, accents et espace pliés, nombre et unité recollés. */
export function normCmp(valeur: string): string {
  return normalize(valeur).replace(/(\d)\s*(g|kg|mg|ml|cl|%)/gi, "$1$2");
}

/** Tous les mots mesurés du BAT — corps ET police rattachés, les deux. */
export function motsMesures(analyses: AnalyseBat[]): MotBat[] {
  return analyses
    .flatMap((a) => a.pages)
    .flatMap((p) => p.mots)
    .filter((m) => m.corpsPt !== null && m.police !== null);
}

export interface MesureMention {
  mention: string;
  /** Le mot le plus petit de la mention — c'est lui qui contraint le seuil. */
  motLePlusPetit: string;
  corpsPt: number;
  police: string;
  hauteurXmm: number;
  /** Mots de la mention effectivement mesurés, sur ceux retrouvés. */
  motsMesures: number;
  motsTrouves: number;
}

/** Pourquoi une mention n'a pas pu être mesurée — la nuance compte pour Marie. */
export type EchecMesure = "absente" | "corps-non-rattache";

/** Découpe une mention en mots comparables, les mots courts écartés. */
export function tokens(mention: string): string[] {
  return normCmp(mention)
    .split(/[\s,.;:()]+/)
    .filter((mot) => mot.length >= 4);
}

/**
 * Retrouve l'occurrence d'une mention dans une suite de mots, puis mesure.
 *
 * On ne mesure pas n'importe quel mot homonyme : « figue » figure aussi dans le
 * texte marketing en petit corps, et le prendre pour la liste d'ingrédients
 * ferait remonter une non-conformité imaginaire. On cherche donc la **fenêtre**
 * de lecture où les mots de la mention se concentrent, et on ne mesure que
 * dedans. La plus petite hauteur de x y décide, puisque le seuil doit être tenu
 * par toute la mention.
 */
export function mesurerMention(
  mention: string,
  pages: MotBat[][],
  polices: Record<string, MetriquePolice>
): MesureMention | EchecMesure {
  const attendus = new Set(tokens(mention));
  if (attendus.size === 0) return "absente";

  // Une fenêtre laisse de la place aux mots courts écartés et à la ponctuation.
  const largeur = attendus.size * 2 + 3;
  const requis = Math.max(1, Math.ceil(attendus.size * 0.6));

  // Toutes les occurrences denses comptent, pas seulement la première : une
  // mention peut être répétée d'une face à l'autre, et le seuil doit être tenu
  // partout où elle est imprimée. C'est donc la plus petite qui décide.
  const retenus: MotBat[] = [];
  for (const mots of pages) {
    for (let i = 0; i < mots.length; i++) {
      const fenetre = mots.slice(i, i + largeur);
      const dedans = fenetre.filter((m) => attendus.has(normCmp(m.texte)));
      const couverture = new Set(dedans.map((m) => normCmp(m.texte))).size;
      if (couverture >= requis) retenus.push(...dedans);
    }
  }

  if (retenus.length === 0) return "absente";

  // Un mot compté une seule fois, quel que soit le nombre de fenêtres qui le
  // recouvrent — sinon la part mesurée ne voudrait rien dire.
  const distincts = [...new Map(retenus.map((m) => [`${m.x}|${m.y}|${m.texte}`, m])).values()];

  let mesure: Omit<MesureMention, "motsMesures" | "motsTrouves"> | null = null;
  let mesures = 0;
  for (const mot of distincts) {
    if (mot.corpsPt === null || mot.police === null) continue;
    const metrique = polices[mot.police];
    if (!metrique) continue;
    mesures += 1;
    const h = hauteurXmm(mot.corpsPt, metrique);
    if (!mesure || h < mesure.hauteurXmm) {
      mesure = {
        mention,
        motLePlusPetit: mot.texte,
        corpsPt: mot.corpsPt,
        police: metrique.nom,
        hauteurXmm: h,
      };
    }
  }
  if (mesure) return { ...mesure, motsMesures: mesures, motsTrouves: distincts.length };
  return "corps-non-rattache";
}


/** Assemble les métriques de police de toutes les faces. */
export function toutesPolices(analyses: AnalyseBat[]): Record<string, MetriquePolice> {
  return Object.assign({}, ...analyses.map((a) => a.polices));
}

/** Les mots de chaque face, dans l'ordre de lecture. */
export function pagesDeMots(analyses: AnalyseBat[]): MotBat[][] {
  return analyses.flatMap((a) => a.pages).map((p) => p.mots);
}

