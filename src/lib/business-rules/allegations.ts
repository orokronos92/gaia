/**
 * Vérification des Allégations de Santé.
 * Règle 4 du PRD-03.
 */

export interface AllegationContext {
    sousDesignationFr: string;
    allegationsSanteFr: string;
    texteCommercialFr: string;
    denominationFr: string;
}

const ALLEGATION_KEYWORDS = [
    "détox", "detox", "drainant", "drainante", "purifiant", "purifiante",
    "tonifiant", "tonifiante", "tonique", "stimulant", "stimulante",
    "vitalité", "énergie", "énergisant", "digestif", "digestive",
    "digestion", "relaxant", "relaxante", "sommeil", "apaisant",
    "apaisante", "anti-inflammatoire", "immunité", "minceur"
];

export function checkAllegations(ctx: AllegationContext): {
    status: 'PASS' | 'FAIL' | 'WARNING';
    detected: string[];
    mentionsPresentes: { nutritionnelle: boolean; nbTasses: boolean; phraseModeDeVie: boolean };
    explanation: string;
} {
    const fullText = [
        ctx.sousDesignationFr,
        ctx.allegationsSanteFr,
        ctx.texteCommercialFr,
        ctx.denominationFr
    ].join(' ').toLowerCase();

    const detected = ALLEGATION_KEYWORDS.filter(kw => fullText.includes(kw));

    if (detected.length === 0) {
        return {
            status: 'PASS',
            detected: [],
            mentionsPresentes: { nutritionnelle: true, nbTasses: true, phraseModeDeVie: true },
            explanation: "Aucune allégation santé détectée."
        };
    }

    const allegationsLower = ctx.allegationsSanteFr?.toLowerCase() || "";

    const hasNutrition = allegationsLower.includes("informations nutritionnelles moyennes");
    const hasTasses = allegationsLower.includes("consommation journalière");
    const hasModeDeVie = allegationsLower.includes("mode de vie sain");

    if (!hasNutrition || !hasTasses || !hasModeDeVie) {
        return {
            status: 'FAIL',
            detected,
            mentionsPresentes: { nutritionnelle: hasNutrition, nbTasses: hasTasses, phraseModeDeVie: hasModeDeVie },
            explanation: "Une ou plusieurs mentions obligatoires (Nutrition, Tasses, Phrase légale) sont manquantes pour l'allégation détectée."
        };
    }

    return {
        status: 'PASS',
        detected,
        mentionsPresentes: { nutritionnelle: true, nbTasses: true, phraseModeDeVie: true },
        explanation: "Toutes les mentions obligatoires liées aux allégations sont présentes."
    };
}
