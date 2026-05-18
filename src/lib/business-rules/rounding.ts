/**
 * Moteur d'arrondis pour la recette d'ingrédients de l'étiquette.
 * Règle 1 du PRD-03.
 */

export interface IngredientInput {
    name: string;
    qtyKg: number;
}

export interface IngredientRounded extends IngredientInput {
    pctBrut: number;
    pctLabel: number;
}

export function calculateRoundings(ingredients: IngredientInput[]): {
    results: IngredientRounded[];
    adjustmentApplied: { ingredient: string; delta: number } | null;
    totalPercent: number;
    status: 'PASS' | 'FAIL';
} {
    const totalKg = ingredients.reduce((sum, item) => sum + item.qtyKg, 0);

    if (totalKg === 0) {
        return { results: [], adjustmentApplied: null, totalPercent: 0, status: 'FAIL' };
    }

    // Étape 2: Calcul et arrondis à 1 décimale
    let results: IngredientRounded[] = ingredients.map(ing => {
        const pctBrut = (ing.qtyKg / totalKg) * 100;
        const decimalStr = pctBrut.toFixed(2); // ex: "62.18"
        const lastDigit = parseInt(decimalStr.charAt(decimalStr.length - 1));

        let pctLabel = pctBrut;
        if (lastDigit <= 4) {
            pctLabel = Math.floor(pctBrut * 10) / 10;
        } else {
            pctLabel = Math.ceil(pctBrut * 10) / 10;
        }

        // Règle des traces < 0.05%
        if (pctBrut < 0.05) {
            pctLabel = 0;
        }

        return {
            ...ing,
            pctBrut,
            pctLabel
        };
    });

    // Étape 3: Vérification si Somme = 100.0%
    let sumRounded = results.reduce((sum, item) => sum + item.pctLabel, 0);
    // Pour éviter les bugs float Javascript ex: 100.000000001
    sumRounded = Math.round(sumRounded * 10) / 10;

    let adjustmentApplied = null;

    // Étape 4: Ajustement
    if (sumRounded !== 100.0) {
        const difference = Math.round((sumRounded - 100.0) * 10) / 10;

        // Trouver le candidat (Plus gros % non nul)
        let candidateIndex = -1;
        let maxPct = -1;
        for (let i = 0; i < results.length; i++) {
            if (results[i].pctLabel > maxPct) {
                maxPct = results[i].pctLabel;
                candidateIndex = i;
            }
        }

        if (candidateIndex !== -1) {
            // Ajustement inversé (si sum=100.1, difference=0.1, donc on enlève 0.1)
            results[candidateIndex].pctLabel = Math.round((results[candidateIndex].pctLabel - difference) * 10) / 10;
            adjustmentApplied = {
                ingredient: results[candidateIndex].name,
                delta: -difference
            };
            sumRounded = 100.0;
        } else {
            return { results, adjustmentApplied: null, totalPercent: sumRounded, status: 'FAIL' };
        }
    }

    return {
        results,
        adjustmentApplied,
        totalPercent: sumRounded,
        status: 'PASS'
    };
}
