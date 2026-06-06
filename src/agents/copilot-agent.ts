import { z } from "zod";
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
     * Proposes plausible kilogram quantities for ingredients missing one
     * (SPEC-03b §6). NON-BINDING: the result is a suggestion Marie accepts or
     * ignores — it never writes anything. The LLM proposes nothing about the
     * regulatory %; that stays deterministic (computeRecette). Output is
     * Zod-validated (CLAUDE.md §7); any failure degrades to "faible confiance".
     */
    async suggererQuantites(input: {
        produitContexte: string;
        connus: { designation: string; pourcentage: number | null; quantiteKg: number | null }[];
        manquants: string[];
        masseLotKg: number | null;
    }): Promise<{
        suggestions: { designation: string; quantiteKg: number; confiance: "FAIBLE" | "MOYENNE" | "FORTE" }[];
        note: string;
    }> {
        const SuggestionSchema = z.object({
            suggestions: z.array(
                z.object({
                    designation: z.string(),
                    quantiteKg: z.number().nonnegative(),
                    confiance: z.enum(["FAIBLE", "MOYENNE", "FORTE"]),
                })
            ),
            note: z.string(),
        });

        const apiKey = process.env.MISTRAL_API_KEY ?? "";
        if (!apiKey) {
            return { suggestions: [], note: "Suggestion IA indisponible (clé Mistral absente)." };
        }

        // RAG over the knowledge base (regulatory + any indexed recipes); tolerant of empty.
        const ctx = await RAGService.searchContext(
            `recette ingrédients ${input.produitContexte}`,
            3
        ).catch(() => []);
        const contexteRag = RAGService.formatContextForPrompt(ctx);
        const faibleConfiance = ctx.length === 0;

        const connusTxt = input.connus
            .map(
                (c) =>
                    `- ${c.designation}: ${c.quantiteKg != null ? `${c.quantiteKg} kg` : c.pourcentage != null ? `${c.pourcentage} %` : "inconnu"}`
            )
            .join("\n");

        const systemPrompt = `Tu assistes l'équipe Qualité (Marie) de GaïaLabel pour estimer des quantités d'ingrédients MANQUANTES dans une recette de thé/infusion.
RÈGLES STRICTES :
1. Tu PROPOSES seulement des quantités plausibles en kilogrammes, jamais des pourcentages.
2. Base-toi sur les quantités connues, la masse de lot, et le contexte ci-dessous. N'invente pas de certitude.
3. Si tu n'as pas d'élément fiable (pas de recette voisine), mets confiance "FAIBLE".
4. Réponds UNIQUEMENT par un JSON: {"suggestions":[{"designation":string,"quantiteKg":number,"confiance":"FAIBLE"|"MOYENNE"|"FORTE"}],"note":string}.

${contexteRag}`;

        const userContent = `Masse de lot: ${input.masseLotKg != null ? `${input.masseLotKg} kg` : "inconnue"}
Ingrédients connus:
${connusTxt || "(aucun)"}

Ingrédients à estimer (quantité manquante): ${input.manquants.join(", ")}

Donne une quantité kg plausible pour CHAQUE ingrédient à estimer.`;

        try {
            const response = await this.mistralClient.chat.complete({
                model: "mistral-large-latest",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userContent },
                ],
                responseFormat: { type: "json_object" },
                maxTokens: 800,
                temperature: 0.2,
            });
            const raw = response.choices?.[0]?.message?.content;
            const parsed = SuggestionSchema.parse(
                JSON.parse(typeof raw === "string" ? raw : "{}")
            );
            const note = faibleConfiance
                ? `${parsed.note} (aucune recette voisine trouvée — fiabilité réduite)`
                : parsed.note;
            const suggestions = faibleConfiance
                ? parsed.suggestions.map((s) => ({ ...s, confiance: "FAIBLE" as const }))
                : parsed.suggestions;
            return { suggestions, note };
        } catch {
            return {
                suggestions: [],
                note: "La suggestion IA n'a pas pu être produite (réponse non exploitable).",
            };
        }
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
