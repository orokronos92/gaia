/**
 * Les contrôles mesurés sur un BAT, en un seul point d'entrée.
 *
 * Cinq familles, toutes déterministes : les tailles (§12, §4, §2.3), les styles
 * (§3.1, §11.1), les positions (§1, §4, §6), la reconnaissance de l'Eurofeuille
 * par son tracé (§11.1), et les mentions que l'étiquette porte en toutes lettres
 * (§2.1, §5, §6, §9, §11.1).
 * L'orchestrateur n'a pas à savoir laquelle vit dans quel module — il lui donne
 * les faces lues et la fiche, et reçoit des constats opposables.
 */

import type { AnalyseBat } from "@/lib/utils/pdf-bat";
import { controlerEurofeuille, mesurerEurofeuille } from "./eurofeuille";
import { facesBat } from "./mesure-mentions";
import { controlerMentions, type EntreeMentions } from "./mentions-etiquette";
import { controlerPositions } from "./positions";
import { controlerPropositions } from "./propositions";
import { controlerStyle, type EntreeStyle } from "./style-typo";
import type { BatTextCheck } from "./text-robot";
import { controlerTypographie, type EntreeTypo } from "./typographie";

export type EntreeBat = EntreeTypo & EntreeStyle & EntreeMentions;

/** Une face lue en profondeur, avec le nom sous lequel Marie la connaît. */
export interface FaceBat {
  nom: string;
  analyse: AnalyseBat;
}

export function controlerBat(faces: FaceBat[], entree: EntreeBat): BatTextCheck[] {
  if (faces.length === 0) return [];
  const analyses = faces.map((f) => f.analyse);
  const noms = faces.map((f) => f.nom);
  // L'Eurofeuille est mesurée une fois : elle sert son propre point (13.1) et
  // donne au §11.1 la position qui manquait au contrôle d'origine (8.1).
  const eurofeuilles = analyses.map((a) => mesurerEurofeuille(a.traces));
  const pages = facesBat(analyses);

  return [
    ...controlerTypographie(analyses, entree),
    ...controlerStyle(analyses, entree),
    ...controlerPositions(analyses, entree, noms, eurofeuilles),
    controlerEurofeuille(eurofeuilles, pages),
    ...controlerPropositions(analyses, entree),
    ...controlerMentions(analyses, entree),
  ];
}
