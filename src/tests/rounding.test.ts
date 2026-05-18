import { describe, it, expect } from 'vitest';
import { calculateRoundings } from '../lib/business-rules/rounding';

describe('Business Rules - Rounding (PRO-QHS-013)', () => {

    it('devrait arrondir correctement et ajuster pour atteindre exactement 100.0%', () => {
        const ingredients = [
            { name: 'Thé vert', qtyKg: 60 },
            { name: 'Arôme naturel', qtyKg: 20 },
            { name: 'Fleurs', qtyKg: 20.3 }
        ];

        const result = calculateRoundings(ingredients);

        // Total KG = 100.3
        // Pct Brut: 
        // Thé vert: 59.82% -> 59.8%
        // Arôme: 19.94% -> 19.9%
        // Fleurs: 20.23% -> 20.2%
        // Somme arrondie absolue: 99.9%
        // La règle d'ajustement devrait rajouter 0.1% au composant majoritaire (Thé vert) -> 59.9%

        expect(result.status).toBe('PASS');
        expect(result.totalPercent).toBe(100.0);

        const theVert = result.results.find((i: any) => i.name === 'Thé vert');
        expect(theVert?.pctLabel).toBe(59.9);

        expect(result.adjustmentApplied?.ingredient).toBe('Thé vert');
        expect(result.adjustmentApplied?.delta).toBeCloseTo(0.1);
    });

    it('devrait masquer les traces inférieures à 0.05%', () => {
        const ingredients = [
            { name: 'Thé noir', qtyKg: 99.96 },
            { name: 'Poussière de fée', qtyKg: 0.04 }
        ];

        const result = calculateRoundings(ingredients);

        const poussiere = result.results.find((i: any) => i.name === 'Poussière de fée');
        expect(poussiere?.pctLabel).toBe(0); // Trace
        expect(result.totalPercent).toBe(100.0);
    });

});
