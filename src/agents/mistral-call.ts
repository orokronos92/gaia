/**
 * The single choke point for every Mistral chat call.
 *
 * Agents used to instantiate their own client and call `chat.complete` directly
 * in nine places, so there was nowhere to measure anything: ~80% of token usage
 * was invisible. This wrapper keeps the exact same request and response shapes —
 * only the accounting is added — so call sites change by one line and nothing
 * downstream needs to know.
 */

import { Mistral } from "@mistralai/mistralai";
import type { ChatCompletionRequest } from "@mistralai/mistralai/models/components";

import { recordUsage, type UsageEntry } from "@/db/queries/usage-ia";

export type AgentIA = UsageEntry["agent"];

export interface CallMeta {
    agent: AgentIA;
    /** Business entity the call relates to (codePf, fiche id...), when known. */
    entiteId?: string;
    utilisateurId?: string;
}

let client: Mistral | null = null;

/** Lazily built so a missing key fails at call time, not at module import. */
export function getMistralClient(): Mistral {
    if (!client) {
        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey) {
            throw new Error("MISTRAL_API_KEY manquante — agents IA indisponibles.");
        }
        client = new Mistral({ apiKey });
    }
    return client;
}

/**
 * Same signature as `client.chat.complete`, plus a descriptor of who is calling.
 * The usage write is deliberately not awaited: accounting must never add latency
 * to, or break, a user-facing action.
 */
export async function callMistral(params: ChatCompletionRequest, meta: CallMeta) {
    const response = await getMistralClient().chat.complete(params);

    void recordUsage({
        agent: meta.agent,
        modele: params.model ?? "inconnu",
        tokensEntree: response.usage?.promptTokens ?? 0,
        tokensSortie: response.usage?.completionTokens ?? 0,
        entiteId: meta.entiteId,
        utilisateurId: meta.utilisateurId,
    });

    return response;
}
