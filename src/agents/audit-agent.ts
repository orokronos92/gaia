import { BaseAgent } from "./BaseAgent";

interface AuditAgentInput {
    codePf: string;
    denominationFr: string;
    sousDesignationFr: string;
    typeTheFr: string;
    aromatise: boolean;
    origine: string;
    labels: string[];
    ingredientsFr: string;
    allegationsSanteFr: string;
    texteCommercialFr: string;
    recetteTable: any[]; // The parsed recipe array
    allergenes: string;
    phraseWftoFr: string;
    ecocertMention: string;
    poidsNet: string;
    tempsInfusion: string;
    tempInfusion: string;
}

export interface AuditAgentOutput {
    denomination: { status: "PASS" | "FAIL" | "WARNING"; current: string; suggestion: string | null; explanation: string };
    ingredients: { status: "PASS" | "FAIL" | "WARNING"; issues: { field: string; issue: string; severity: "HIGH" | "MEDIUM" | "LOW" }[] };
    quid: { status: "PASS" | "FAIL" | "WARNING"; missingPercents: string[]; explanation: string };
    allegations: { status: "PASS" | "FAIL" | "WARNING"; detected: string[]; mentionsPresentes: { nutritionnelle: boolean; nbTasses: boolean; phraseModeDeVie: boolean }; explanation: string };
    allergens: { status: "PASS" | "FAIL" | "WARNING"; explanation: string };
    reglisse: { status: "PASS" | "FAIL" | "SKIP"; explanation: string };
    labels: { status: "PASS" | "FAIL" | "WARNING"; issues: string[] };
    globalScore: "CONFORME" | "NON_CONFORME" | "A_VERIFIER";
    summary: string;
    recommendations: string[];
}

import { MistralProvider } from "./MistralProvider";

/**
 * Agent 2 (PRD-04) - Audit réglementaire global.
 */
export class AuditAgent extends BaseAgent {
    constructor() {
        const apiKey = process.env.MISTRAL_API_KEY;
        const provider = apiKey ? new MistralProvider(apiKey) : undefined;
        super("AuditAgent", provider);
    }

    async execute(input: AuditAgentInput): Promise<AuditAgentOutput> {
        const systemPrompt = `Tu es un expert en réglementation de l'étiquetage alimentaire en France et en Europe, spécialisé dans les thés et infusions. Tu travailles pour Les Jardins de Gaïa.
Tu connais parfaitement le règlement INCO (UE n°1169/2011), le code STEPI et la procédure interne PRO-QHS-013.

Analyse la fiche produit ci-dessous et retourne UNIQUEMENT un objet JSON valide, sans text avant ou après.

Schéma JSON attendu :
{
  "denomination": { "status": "PASS|FAIL|WARNING", "current": "valeur", "suggestion": null, "explanation": "..." },
  "ingredients": { "status": "PASS|FAIL|WARNING", "issues": [] },
  "quid": { "status": "PASS|FAIL|WARNING", "missingPercents": [], "explanation": "..." },
  "allegations": { "status": "PASS|FAIL|WARNING", "detected": [], "mentionsPresentes": { "nutritionnelle": true, "nbTasses": true, "phraseModeDeVie": true }, "explanation": "..." },
  "allergens": { "status": "PASS|FAIL|WARNING", "explanation": "..." },
  "reglisse": { "status": "PASS|FAIL|SKIP", "explanation": "..." },
  "labels": { "status": "PASS|FAIL|WARNING", "issues": [] },
  "globalScore": "CONFORME|NON_CONFORME|A_VERIFIER",
  "summary": "Résumé en 2 phrases",
  "recommendations": []
}`;

        const userContent = `Voici la fiche produit complète à auditer :
Code : ${input.codePf}
Dénomination FR : ${input.denominationFr}
Sous-désignation FR : ${input.sousDesignationFr}
Type de thé FR : ${input.typeTheFr}
Aromatisé : ${input.aromatise}
Origine : ${input.origine}
Labels : ${input.labels.join(", ")}
Liste d'ingrédients FR : ${input.ingredientsFr}
Allégations santé FR : ${input.allegationsSanteFr}
Texte commercial FR : ${input.texteCommercialFr}
Recette : ${JSON.stringify(input.recetteTable)}
Allergènes : ${input.allergenes}
Phrase WFTO : ${input.phraseWftoFr}
Ecocert : ${input.ecocertMention}
Poids net : ${input.poidsNet}
Infusion : ${input.tempsInfusion} min / ${input.tempInfusion}°C`;

        try {
            const responseText = await this.generateResponse(systemPrompt, userContent);
            return this.parseJson<AuditAgentOutput>(responseText);
        } catch (e: any) {
            console.error("Echec au sein de l'AuditAgent:", e);
            throw e;
        }
    }
}
