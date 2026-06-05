import { BaseAgent } from "./BaseAgent";
import { RAGService } from "./knowledge/RAGService";
import { Mistral } from "@mistralai/mistralai";
import { MistralProvider } from "./MistralProvider";
import {
    RecetteAgent,
    type RecetteAgentInput,
    type RecetteAgentOutput,
} from "./recette/RecetteAgent";

interface CopilotInput {
    query: string;
    conversationHistory: { role: "user" | "assistant", content: string }[];
}

export interface CopilotOutput {
    response: string;
    sourcesUsed: { documentName: string }[];
}

export class CopilotAgent extends BaseAgent {
    private mistralClient: InstanceType<typeof Mistral>;

    constructor() {
        super("CopilotAgent");
        const apiKey = process.env.MISTRAL_API_KEY ?? "";
        this.mistralClient = new Mistral({ apiKey });
    }

    async execute(input: CopilotInput): Promise<CopilotOutput> {
        // 1. Recherche dans la base de connaissances (méthodes statiques RAGService)
        const contextResults = await RAGService.searchContext(input.query, 3);
        const hasContext = contextResults.length > 0;

        let contextText = "";
        let sources: { documentName: string }[] = [];

        if (hasContext) {
            contextText = "CONTEXTE RÉGLEMENTAIRE TROUVÉ DANS LA BASE DE DONNÉES :\n" +
                contextResults.map((c: { documentName: string; content: string }) =>
                    `[Doc: ${c.documentName}]\n${c.content}`
                ).join("\n\n");

            const uniqueSources = new Set(contextResults.map((c: { documentName: string }) => c.documentName));
            sources = Array.from(uniqueSources).map((name: string) => ({ documentName: name }));
        }

        const systemPrompt = `Tu es l'Assistante IA (Co-Pilote) de GaïaLabel, une application experte en contrôle qualité et réglementation pour les thés et infusions (Les Jardins de Gaïa).
Ton rôle est d'aider 'Marie' (Responsable Qualité) et son équipe.
Tu dois répondre de manière polie, professionnelle et concise.
Si la question porte sur la réglementation ou les procédures (ex: QUID, INCO, allégations, mention WFTO), tu DOIS te baser UNIQUEMENT sur le contexte fourni ci-dessous.
Si le contexte ne contient pas la réponse, dis clairement que tu ne trouves pas la réponse dans la base documentaire.
Ne calcule jamais une recette toi-même : les pourcentages QUID et la conformité Demeter sont calculés de manière déterministe par l'Agent de Recette (onglet Recette). Pour tout calcul chiffré, renvoie l'utilisateur vers cet outil.

${contextText}

CONSIGNES :
1. Réponds directement en Markdown structuré.
2. N'invente jamais de règles qui ne sont pas dans le contexte.
3. Sois proactive sur les conseils qualité.`;

        // Construction de l'historique complet pour Mistral
        const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
            { role: "system", content: systemPrompt },
            ...input.conversationHistory.map(msg => ({
                role: msg.role as "user" | "assistant",
                content: msg.content,
            })),
            { role: "user", content: input.query },
        ];

        const response = await this.mistralClient.chat.complete({
            model: "mistral-large-latest",
            messages,
            maxTokens: 1000,
            temperature: 0.2,
        });

        const responseText =
            (response.choices?.[0]?.message?.content as string) ??
            "Désolé, je n'ai pas pu générer de réponse.";

        return {
            response: responseText,
            sourcesUsed: sources,
        };
    }

    /**
     * Delegates a recipe computation to the (now real) Agent de Recette.
     * Figures are deterministic; the LLM only phrases the ingredient list.
     * Structured input comes from the Recette UI (SPEC-03), not free chat.
     */
    async executeRecette(input: RecetteAgentInput): Promise<RecetteAgentOutput> {
        const apiKey = process.env.MISTRAL_API_KEY ?? "";
        const recetteAgent = new RecetteAgent(new MistralProvider(apiKey));
        return recetteAgent.execute(input);
    }
}
