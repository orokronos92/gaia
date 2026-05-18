/**
 * Logique de détermination de Dénomination Légale.
 * Règle 2 du PRD-03.
 */

export interface DenominationContext {
    typeTheFr: string;
    isAromatise: boolean;
    ingredients: { name: string; pct: number }[];
}

export function determineLegalDenomination(ctx: DenominationContext): {
    denominationProposee: string;
    regle: string;
    confidence: 'HIGH' | 'MEDIUM'
} {
    const theList = ["thé vert", "thé noir", "thé blanc", "thé wulong", "thé sombre", "thé matcha", "thé vert matcha", "thé pu-erh"];

    // Chercher si l'un des ingrédients est du thé et sa quantité (simplifié pour agent)
    let teaPercentage = 0;
    for (const ing of ctx.ingredients) {
        const lowerName = ing.name.toLowerCase();
        if (theList.some(t => lowerName.includes(t)) || lowerName.includes("thé ")) {
            teaPercentage += ing.pct;
        }
    }

    // Cas Spécial Rooibos / Maté
    const hasRooibos = ctx.ingredients.some(i => i.name.toLowerCase().includes("rooibos"));
    const hasMate = ctx.ingredients.some(i => i.name.toLowerCase().includes("maté"));

    if (hasRooibos && teaPercentage === 0) {
        if (ctx.isAromatise) return { denominationProposee: "Rooibos aromatisé", regle: "4", confidence: 'HIGH' };
        return { denominationProposee: "Rooibos", regle: "4", confidence: 'HIGH' };
    }

    if (hasMate && teaPercentage === 0) {
        if (ctx.isAromatise) return { denominationProposee: "Maté Vert aromatisé", regle: "4", confidence: 'HIGH' };
        return { denominationProposee: "Maté Vert", regle: "4", confidence: 'HIGH' };
    }

    // Règle 1: Thé majoritaire >= 51%
    if (teaPercentage >= 51) {
        if (!ctx.isAromatise) {
            return { denominationProposee: `Thé ${ctx.typeTheFr.replace("Thé ", "").toLowerCase()}`, regle: "1a", confidence: 'MEDIUM' };
        }
        return { denominationProposee: `Thé aromatisé`, regle: "1f", confidence: 'MEDIUM' };
    }

    // Règle 2: Pas de thé ou < 50%
    if (teaPercentage < 50) {
        if (!ctx.isAromatise) {
            return { denominationProposee: "Mélange de plantes à infusion", regle: "2b", confidence: 'HIGH' };
        } else {
            return { denominationProposee: "Infusion de plantes aromatisée", regle: "2c", confidence: 'HIGH' };
        }
    }

    return { denominationProposee: "Mélange à aromatiser", regle: "Inconnue", confidence: 'MEDIUM' };
}
