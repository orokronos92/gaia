/**
 * Libellés français des statuts de fiche étiquette.
 *
 * Ils vivaient uniquement dans la liste déroulante de la fiche ; le tableau
 * Produits affichait la constante brute (`QUALITY REVIEW`, `ARCHIVED`). Une
 * seule source, deux écrans.
 *
 * `ARCHIVED` se dit « Plus produite » : c'est l'ÉTIQUETTE qui n'est plus
 * imprimée, alors que le produit reste au catalogue. À ne pas confondre avec le
 * retrait du catalogue (produit, réversible) ni avec la suppression (produit,
 * définitive).
 */
export const LIBELLES_STATUT: Record<string, string> = {
    DRAFT: "Brouillon",
    QUALITY_REVIEW: "Révision Qualité",
    QUALITY_VALIDATED: "Validé Qualité",
    DESIGN_IN_PROGRESS: "Création graphique",
    DESIGN_REVIEW: "Relecture maquette",
    DESIGN_VALIDATED: "Maquette validée",
    SENT_TO_PRINTER: "Envoyé à l'imprimeur",
    BAT_RECEIVED: "BAT reçu",
    BAT_VALIDATED: "BAT validé",
    PRINTING: "En impression",
    RECEIVED: "Étiquettes reçues",
    RECEPTION_CONTROLLED: "Contrôle réception",
    ACTIVE: "Active",
    ARCHIVED: "Plus produite",
}

/** Ordre du cycle de vie, pour les sélecteurs. */
export const STATUTS_ORDONNES: string[] = Object.keys(LIBELLES_STATUT)

export function libelleStatut(statut: string | null | undefined): string {
    if (!statut) return "—"
    return LIBELLES_STATUT[statut] ?? statut.replace(/_/g, " ")
}
