import { coutUsd, TAUX_USD_EUR } from "@/agents/models"

/** French display names for the `agent_ia` enum — UI text stays in French. */
export const LIBELLES_AGENT: Record<string, string> = {
    IMPORT_EXTRACTION: "Import — extraction dossier",
    IMPORT_RECETTE: "Import — recette (Excel)",
    AUDIT_CONFORMITE: "Audit conformité",
    AUDIT_SEMANTIQUE: "Audit BAT — sémantique",
    AUDIT_VISUEL: "Audit BAT — visuel",
    AUDIT_CONTRE_EXAMEN: "Audit BAT — contre-examen",
    COPILOT_CHAT: "Copilote — conversation",
    COPILOT_ESTIMATION: "Copilote — estimation",
    RAG_EMBEDDING: "Base de connaissances",
}

/** Business families, used to answer "what does one import cost?". */
export const LIBELLES_FAMILLE: Record<string, string> = {
    IMPORT: "un import de dossier",
    AUDIT: "un audit d'étiquette",
    COPILOT: "une sollicitation du copilote",
    RAG: "une indexation de document",
}

export function formatEuros(usd: number): string {
    const euros = usd * TAUX_USD_EUR
    if (euros > 0 && euros < 0.01) return "< 0,01 €"
    return euros.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 })
}

export function formatDollars(usd: number): string {
    return `${usd.toFixed(2)} $`
}

export function formatTokens(n: number): string {
    return n.toLocaleString("fr-FR")
}

export interface LigneAgent {
    agent: string
    modele: string
    appels: number
    tokensEntree: number
    tokensSortie: number
}

/** Prices each row with its own model's rate, then sums — models differ in price. */
export function totalUsd(lignes: LigneAgent[]): number {
    return lignes.reduce((acc, l) => acc + coutUsd(l.modele, l.tokensEntree, l.tokensSortie), 0)
}
