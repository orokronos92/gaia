import { BaseAgent } from "./BaseAgent";

interface PdfComparisonAgentInput {
    baseFicheEtiquette: {
        denominationLegale: string;
        texteCommercialFr: string;
        ingredientsFr: string;
        allegationsSanteFr: string;
        allergenes: string;
        mentionsObligatoires: string[];
    };
    pdfContentRipped: string;
}

export interface PdfComparisonOutput {
    status: "CONFORME" | "NON_CONFORME" | "A_VERIFIER";
    divergences: {
        field: string;
        expected: string;
        foundInPdf: string;
        severity: "CRITICAL" | "MINOR";
    }[];
    explanation: string;
}

import { MistralProvider } from "./MistralProvider";

/**
 * Agent 3 (PRD-04) - Comparaison du PDF Graphiste avec Excel.
 */
export class PdfComparisonAgent extends BaseAgent {
    constructor() {
        const apiKey = process.env.MISTRAL_API_KEY;
        const provider = apiKey ? new MistralProvider(apiKey) : undefined;
        super("PdfComparisonAgent", provider);
    }

    async execute(input: PdfComparisonAgentInput): Promise<PdfComparisonOutput> {
        const systemPrompt = `Tu es un assistant de contrôle strict d'orthographe et de conformité pour le service Graphisme des Jardins de Gaïa.
On va te fournir la Fiche Étiquette Validée (la vérité absolue) et le Texte Extrait du PDF final produit par l'illustrateur.
Ton but est de déceler la MOINDRE divergence (mot manquant, faute de frappe, omission volontaire, pourcentage arrondi différemment).

Schéma attendu :
{
  "status": "CONFORME|NON_CONFORME",
  "divergences": [
    { "field": "nom_du_champ", "expected": "...", "foundInPdf": "...", "severity": "CRITICAL|MINOR" }
  ],
  "explanation": "..."
}`;

        const userContent = `Voici la vérité absolue (Fiche Validée) :\n${JSON.stringify(input.baseFicheEtiquette, null, 2)}\n\n---\n\nVoici le texte brut extrait du PDF de l'illustrateur :\n${input.pdfContentRipped}`;

        try {
            const responseText = await this.generateResponse(systemPrompt, userContent);
            return this.parseJson<PdfComparisonOutput>(responseText);
        } catch (e: any) {
            console.error("Echec au sein du PdfComparisonAgent:", e);
            throw e;
        }
    }
}
