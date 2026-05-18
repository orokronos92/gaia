/**
 * Logique de contrôle QUID (Quantitative Ingredient Declaration).
 * Règle 3 du PRD-03.
 */

export interface QuidContext {
    denominationFr: string;
    sousDesignationFr: string;
    ingredients: { name: string; pctLabel: number }[];
}

export function checkQuidCompliance(ctx: QuidContext): {
    status: 'PASS' | 'FAIL' | 'WARNING';
    missingPercents: string[];
    explanation: string;
} {
    const missing: string[] = [];
    const combinedText = `${ctx.denominationFr} ${ctx.sousDesignationFr}`.toLowerCase();

    // On vérifie pour chaque ingrédient s'il est mentionné dans le texte principal
    // S'il est mentionné, il DOIT avoir un pourcentage (ici on simule vérifier si listé correctement).
    // Si contextuellement l'ingrédient n'est pas dans la chaîne des % affichés, c'est un FAIL.
    for (const ing of ctx.ingredients) {
        const isMentioned = combinedText.includes(ing.name.toLowerCase());
        if (isMentioned && ing.pctLabel === undefined) {
            missing.push(ing.name);
        }
    }

    if (missing.length > 0) {
        return {
            status: 'FAIL',
            missingPercents: missing,
            explanation: `QUID manquant pour: ${missing.join(', ')}`
        };
    }

    return { status: 'PASS', missingPercents: [], explanation: 'Tous les QUID nécessaires sont présents.' };
}
