/**
 * Les seuils chiffrés de PRO-QHS-013, isolés de toute lecture de fichier.
 *
 * Des règles pures, testables sans PDF : la surface de la face la plus grande
 * décide de la taille des caractères et de ce qui est exigible ; le grammage
 * décide de la hauteur des chiffres du poids net. Les bornes sont celles de la
 * procédure, qui reprend les articles 13.2, 13.3 et 16.2 du règlement 1169/2011.
 */

/** Seuil de hauteur de x, en millimètres, par tranche de surface (§12). */
export interface TrancheSurface {
  libelle: string;
  seuilHauteurXmm: number;
  /** Sous 10 cm², seules quatre mentions restent obligatoires sur l'emballage. */
  mentionsReduites: boolean;
  /** Sous 25 cm², l'étiquetage nutritionnel ne s'applique pas (§2.3). */
  exemptionNutritionnelle: boolean;
}

/**
 * La face la plus grande décide des seuils. Les bornes sont celles du tableau
 * §12, qui reprend les articles 13.2, 13.3 et 16.2 du règlement 1169/2011.
 */
export function trancheSurface(surfaceCm2: number): TrancheSurface {
  if (surfaceCm2 < 10) {
    return {
      libelle: "< 10 cm²",
      seuilHauteurXmm: 0.9,
      mentionsReduites: true,
      exemptionNutritionnelle: true,
    };
  }
  if (surfaceCm2 < 25) {
    return {
      libelle: "10 à 25 cm²",
      seuilHauteurXmm: 0.9,
      mentionsReduites: false,
      exemptionNutritionnelle: true,
    };
  }
  if (surfaceCm2 <= 80) {
    return {
      libelle: "25 à 80 cm²",
      seuilHauteurXmm: 0.9,
      mentionsReduites: false,
      exemptionNutritionnelle: false,
    };
  }
  return {
    libelle: "> 80 cm²",
    seuilHauteurXmm: 1.2,
    mentionsReduites: false,
    exemptionNutritionnelle: false,
  };
}

/**
 * Hauteur minimale des chiffres de la quantité nominale (§4).
 * Les bornes sont celles de la procédure : 2 mm jusqu'à 50 g inclus, puis 3, 4
 * et 6 mm, chaque palier étant ouvert en bas et fermé en haut.
 */
export function seuilHauteurChiffresMm(grammes: number): number {
  if (grammes <= 50) return 2;
  if (grammes <= 200) return 3;
  if (grammes <= 1000) return 4;
  return 6;
}

/** Le poids net d'une fiche, en grammes. Null si non exprimé en masse. */
export function poidsNetEnGrammes(poidsNet: string): number | null {
  const m = /(-?[\d]+(?:[.,]\d+)?)\s*(kg|g)\b/i.exec(poidsNet.trim());
  if (!m) return null;
  const valeur = Number(m[1].replace(",", "."));
  if (!Number.isFinite(valeur)) return null;
  return m[2].toLowerCase() === "kg" ? valeur * 1000 : valeur;
}

