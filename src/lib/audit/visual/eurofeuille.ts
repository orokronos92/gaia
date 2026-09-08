/**
 * Reconnaissance de l'Eurofeuille par son tracé — PRO-QHS-013 §11.1.
 *
 * Jusqu'ici, la présence de l'Eurofeuille était un avis de modèle de vision :
 * « présent / absent / incertain », sur un logo qu'il avait déjà halluciné une
 * fois. Or ce logo est un artwork **fixe**, reposé à l'identique d'une étiquette
 * à l'autre : son tracé porte une empreinte, et une empreinte se compare sans
 * modèle.
 *
 * Deux temps, chacun auto-validant :
 *
 *   1. **le feuillage d'étoiles** — un sous-tracé de 22 courbes, empreinte
 *      relevée sur l'artwork des Jardins de Gaïa ;
 *   2. **le champ vert qui l'englobe** — retenu par son ratio 1:1,5, celui du
 *      drapeau européen. Le manuel officiel en fait l'unité de mesure du logo,
 *      donc c'est lui, et rien d'autre, qui porte les dimensions de §11.1.
 *
 * Le ratio n'est pas qu'un filtre : il vérifie qu'on a bien attrapé le champ et
 * pas un rectangle voisin. Sans lui, la mesure s'ancrait au hasard.
 *
 * ⚠️ L'empreinte décrit **cet artwork-là**. Si les Jardins de Gaïa redessinent
 * leur Eurofeuille, elle ne correspondra plus — et le contrôle dira « non
 * reconnue », jamais « conforme ». C'est le bon sens de l'échec.
 *
 * Mesuré sur 258 BAT du catalogue : reconnue sur 141 faces avant, jamais sur
 * les 111 contre-étiquettes (où le logo ne figure pas), 3 faces avant manquées
 * sur ~144 — deux sans aucun tracé exploitable, une sur un gabarit différent.
 */

import type { TraceVectoriel } from "@/lib/utils/pdf-vecteurs";
import type { BatTextCheck } from "./text-robot";

const PT_EN_MM = 25.4 / 72;

/** Empreinte du feuillage d'étoiles dans l'artwork JDG. */
const FEUILLAGE = { sousTraces: 1, droites: 0, courbes: 22 } as const;

/** En deçà, ce n'est pas le feuillage mais un fragment de même signature. */
const FEUILLAGE_MIN_MM = 3;

/** Proportions du drapeau européen, reprises par le champ vert du logo. */
const RATIO_MIN = 1.45;
const RATIO_MAX = 1.55;

/** Dimensions minimales du champ vert (manuel Eurofeuille). */
export const EUROFEUILLE_MIN = { largeurMm: 13.5, hauteurMm: 9 };
/**
 * Dérogation « très petits emballages » du même manuel.
 *
 * C'est une **taille précise**, pas un plancher : le manuel autorise le logo à
 * 9 × 6 mm sur les très petits emballages, il n'autorise pas n'importe quelle
 * taille comprise entre 9 × 6 et 13,5 × 9. Un logo à 12,8 × 8,5 mm n'est donc
 * pas « une dérogation » : c'est le logo standard dessiné 5 % trop petit.
 */
export const EUROFEUILLE_DEROGATION = { largeurMm: 9, hauteurMm: 6 };

/** Tolérance d'identification de la taille dérogatoire, en millimètres. */
const TOLERANCE_DEROGATION = 0.3;

export interface MesureEurofeuille {
  largeurMm: number;
  hauteurMm: number;
  /**
   * Boîte du champ vert, en points, repère PDF (origine en bas à gauche).
   * §11.1 exige le logo dans le même champ visuel que le code OC et l'origine,
   * et §6 les veut sous lui : sans sa position, ces points restaient à l'œil.
   */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const estFeuillage = (t: TraceVectoriel) =>
  t.sousTraces === FEUILLAGE.sousTraces &&
  t.droites === FEUILLAGE.droites &&
  t.courbes === FEUILLAGE.courbes &&
  (t.x1 - t.x0) * PT_EN_MM > FEUILLAGE_MIN_MM;

/** Localise l'Eurofeuille sur une face et mesure son champ vert. */
export function mesurerEurofeuille(traces: TraceVectoriel[]): MesureEurofeuille | null {
  const feuillage = traces.find(estFeuillage);
  if (!feuillage) return null;

  const champ = traces
    .filter(
      (t) =>
        t.x0 <= feuillage.x0 + 1 &&
        t.x1 >= feuillage.x1 - 1 &&
        t.y0 <= feuillage.y0 + 1 &&
        t.y1 >= feuillage.y1 - 1
    )
    .filter((t) => {
      const r = (t.x1 - t.x0) / (t.y1 - t.y0);
      return r > RATIO_MIN && r < RATIO_MAX;
    })
    .sort((a, b) => a.x1 - a.x0 - (b.x1 - b.x0))[0];

  if (!champ) return null;
  return {
    largeurMm: Number(((champ.x1 - champ.x0) * PT_EN_MM).toFixed(2)),
    hauteurMm: Number(((champ.y1 - champ.y0) * PT_EN_MM).toFixed(2)),
    x0: champ.x0,
    y0: champ.y0,
    x1: champ.x1,
    y1: champ.y1,
  };
}

/**
 * Verdict du point 13.1 à partir des faces mesurées.
 *
 * L'absence n'est jamais affirmée : ne pas reconnaître un dessin n'est pas la
 * preuve qu'il n'y est pas. Le contrôle dit ce qu'il a vu, et laisse le reste
 * à la vision ou à l'œil.
 */
export function controlerEurofeuille(mesures: (MesureEurofeuille | null)[]): BatTextCheck {
  const base = {
    id: "VEC_EUROFEUILLE",
    origine: "texte" as const,
    rubrique: "Labels et signes de qualité",
    libelle: "Eurofeuille présente et aux dimensions minimales ?",
    checklistId: "13.1",
  };

  const trouvees = mesures.filter((m): m is MesureEurofeuille => m !== null);
  if (trouvees.length === 0) {
    return {
      ...base,
      statut: "WARNING",
      justification:
        "Eurofeuille non reconnue au tracé sur les faces analysées. Cela ne prouve pas son absence — un artwork redessiné ne correspond plus à l'empreinte. À confirmer à l'œil.",
    };
  }

  // La plus grande occurrence est celle qui satisfait l'exigence : le logo peut
  // être repris ailleurs en petit sans que cela retire quoi que ce soit.
  const logo = trouvees.sort((a, b) => b.largeurMm - a.largeurMm)[0];
  const taille = `${logo.largeurMm} × ${logo.hauteurMm} mm`;

  if (logo.largeurMm >= EUROFEUILLE_MIN.largeurMm && logo.hauteurMm >= EUROFEUILLE_MIN.hauteurMm) {
    return {
      ...base,
      statut: "PASS",
      justification: `Eurofeuille reconnue au tracé, champ vert ${taille} — au-dessus du minimum ${EUROFEUILLE_MIN.largeurMm} × ${EUROFEUILLE_MIN.hauteurMm} mm.`,
    };
  }

  const dansLaDerogation =
    Math.abs(logo.largeurMm - EUROFEUILLE_DEROGATION.largeurMm) <= TOLERANCE_DEROGATION &&
    Math.abs(logo.hauteurMm - EUROFEUILLE_DEROGATION.hauteurMm) <= TOLERANCE_DEROGATION;

  if (dansLaDerogation) {
    // Le logo est à la taille dérogatoire exacte. Le manuel l'autorise pour les
    // « très petits emballages » sans chiffrer ce qu'est un très petit
    // emballage : on ne tranche pas à sa place, on nomme la dérogation et on
    // demande qu'elle soit assumée.
    return {
      ...base,
      statut: "WARNING",
      justification: `Eurofeuille reconnue au tracé, champ vert ${taille} — c'est exactement la taille dérogatoire « très petits emballages ». Le manuel ne chiffre pas « très petit » : à assumer explicitement.`,
    };
  }

  return {
    ...base,
    statut: "FAIL",
    justification: `Eurofeuille reconnue au tracé, champ vert ${taille} — sous le minimum ${EUROFEUILLE_MIN.largeurMm} × ${EUROFEUILLE_MIN.hauteurMm} mm, et ce n'est pas la taille dérogatoire ${EUROFEUILLE_DEROGATION.largeurMm} × ${EUROFEUILLE_DEROGATION.hauteurMm} mm : c'est le logo standard dessiné trop petit.`,
  };
}
