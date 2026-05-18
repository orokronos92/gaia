import { Mistral } from "@mistralai/mistralai";
import { LLMProvider, LLMResponse } from "./BaseAgent";

/**
 * Mistral AI Provider — implémentation du LLMProvider pour les agents GaïaLabel.
 * Utilise mistral-large-latest pour les agents texte et pixtral-large-latest pour la vision.
 */
export class MistralProvider implements LLMProvider {
    public client: InstanceType<typeof Mistral>;
    private defaultModel: string;

    constructor(apiKey: string, defaultModel: string = "mistral-large-latest") {
        this.client = new Mistral({ apiKey });
        this.defaultModel = defaultModel;
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

        const response = await this.client.chat.complete({
            model: this.defaultModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            maxTokens: 4000,
            temperature: 0.1,
        });

        const text =
            (response.choices?.[0]?.message?.content as string) ?? "";

        const tokensUsed =
            (response.usage?.promptTokens ?? 0) +
            (response.usage?.completionTokens ?? 0);

        return { text, tokensUsed };
    }
}
