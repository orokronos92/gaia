/**
 * Vérification de la présence de Réglisse et des mentions obligatoires.
 * Règle 5 du PRD-03.
 */

export interface ReglisseContext {
    ingredientsFr: string;
    etiquetteText: string;
}

export function checkReglisse(ctx: ReglisseContext): {
    status: 'PASS' | 'FAIL' | 'SKIP';
    explanation: string;
} {
    const hasReglisse = ctx.ingredientsFr?.toLowerCase().includes("réglisse") || ctx.ingredientsFr?.toLowerCase().includes("reglisse");

    if (!hasReglisse) {
        return { status: 'SKIP', explanation: "Pas de réglisse dans les ingrédients." };
    }

    const expectedMention1 = "contient de la réglisse";
    const expectedMention2 = "hypertension";

    const lowerEtiquette = ctx.etiquetteText?.toLowerCase() || "";

    if (lowerEtiquette.includes(expectedMention1) && lowerEtiquette.includes(expectedMention2)) {
        return {
            status: 'PASS',
            explanation: "La mention obligatoire hypertension pour réglisse est présente."
        };
    }

    return {
        status: 'FAIL',
        explanation: "La réglisse est présente, mais il manque la mention obligatoire 'Contient de la réglisse – Les personnes souffrant d'hypertension doivent éviter toute consommation excessive'."
    };
}
