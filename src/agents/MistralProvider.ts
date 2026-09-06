import { Mistral } from "@mistralai/mistralai";
import { LLMProvider, LLMResponse } from "./BaseAgent";
import { callMistral, type AgentIA } from "./mistral-call";
import { TEXT_MODEL } from "./models";

/**
 * Mistral AI Provider — implémentation du LLMProvider pour les agents GaïaLabel.
 * Les modèles viennent de `models.ts`; chaque appel est comptabilisé dans `usage_ia`.
 */
export class MistralProvider implements LLMProvider {
    public client: InstanceType<typeof Mistral>;
    private defaultModel: string;

    private agent: AgentIA;

    constructor(apiKey: string, defaultModel: string = TEXT_MODEL, agent: AgentIA = "COPILOT_ESTIMATION") {
        this.client = new Mistral({ apiKey });
        this.defaultModel = defaultModel;
        this.agent = agent;
    }

    async generate(prompt: string, context?: any): Promise<LLMResponse> {
        let systemPrompt = "Vous êtes un agent expert GaïaLabel.";
        let userPrompt = prompt;

        // Si le prompt a été formaté avec notre utilitaire BaseAgent
        if (prompt.includes("\n\nUser: ")) {
            const parts = prompt.split("\n\nUser: ");
            systemPrompt = parts[0];
            userPrompt = parts[1];
        }

        const response = await callMistral({
            model: this.defaultModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            maxTokens: 4000,
            temperature: 0.1,
        }, { agent: this.agent });

        const text =
            (response.choices?.[0]?.message?.content as string) ?? "";

        const tokensUsed =
            (response.usage?.promptTokens ?? 0) +
            (response.usage?.completionTokens ?? 0);

        return { text, tokensUsed };
    }
}
