/**
 * Les contrôles mesurés sur un BAT, en un seul point d'entrée.
 *
 * Trois familles, toutes déterministes et toutes chiffrées : les tailles
 * (§12, §4, §2.3), les styles (§3.1, §11.1) et les positions (§1, §4, §6).
 * L'orchestrateur n'a pas à savoir laquelle vit dans quel module — il lui donne
 * les faces lues et la fiche, et reçoit des constats opposables.
 */

import type { AnalyseBat } from "@/lib/utils/pdf-bat";
import { controlerPositions } from "./positions";
import { controlerStyle, type EntreeStyle } from "./style-typo";
import type { BatTextCheck } from "./text-robot";
import { controlerTypographie, type EntreeTypo } from "./typographie";

export type EntreeBat = EntreeTypo & EntreeStyle;

/** Une face lue en profondeur, avec le nom sous lequel Marie la connaît. */
export interface FaceBat {
  nom: string;
  analyse: AnalyseBat;
}

export function controlerBat(faces: FaceBat[], entree: EntreeBat): BatTextCheck[] {
  if (faces.length === 0) return [];
  const analyses = faces.map((f) => f.analyse);
  const noms = faces.map((f) => f.nom);
  return [
    ...controlerTypographie(analyses, entree),
    ...controlerStyle(analyses, entree),
    ...controlerPositions(analyses, entree, noms),
  ];
}
