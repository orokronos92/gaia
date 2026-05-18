import Anthropic from "@anthropic-ai/sdk";
import { LLMProvider, LLMResponse } from "./BaseAgent";

export class AnthropicProvider implements LLMProvider {
    public client: Anthropic;
    private defaultModel: string;

    constructor(apiKey: string, defaultModel: string = "claude-3-5-sonnet-20241022") {
        this.client = new Anthropic({ apiKey });
        this.defaultModel = defaultModel;
    }

    async generate(prompt: string, context?: any): Promise<LLMResponse> {
        let systemPrompt = "Vous êtes un agent expert GaïaLabel.";
        let userPrompt = prompt;

        // Si le prompt a été formaté avec notre utilitaire
        if (prompt.includes("\n\nUser: ")) {
            const parts = prompt.split("\n\nUser: ");
            systemPrompt = parts[0];
            userPrompt = parts[1];
        }

        const msg = await this.client.messages.create({
            model: this.defaultModel,
            max_tokens: 4000,
            temperature: 0.1, // Basse température pour de l'audit strict
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
        });

        const text = msg.content[0].type === "text" ? msg.content[0].text : "";

        return {
            text,
            tokensUsed: msg.usage.input_tokens + msg.usage.output_tokens,
        };
    }
}
