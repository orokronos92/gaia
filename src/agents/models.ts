/**
 * Single source of truth for which Mistral model each agent family uses, and
 * what a call costs.
 *
 * Before this file, model names were hardcoded in nine call sites. When Mistral
 * retired `pixtral-large-latest` and the workspace tier changed (2026-09-06),
 * switching models meant editing every agent. Overriding via env now makes it a
 * deployment concern, not a code change — useful to fall back to a cheaper model
 * if the monthly budget runs low.
 */

/** General reasoning and structured extraction (imports, audit, copilot). */
export const TEXT_MODEL = process.env.MISTRAL_TEXT_MODEL ?? "mistral-large-latest";

/** Multimodal: reads BAT PDFs natively via `document_url`. */
export const VISION_MODEL = process.env.MISTRAL_VISION_MODEL ?? "mistral-medium-latest";

/** RAG embeddings, 1024 dimensions — must match the pgvector column width. */
export const EMBEDDING_MODEL = process.env.MISTRAL_EMBEDDING_MODEL ?? "mistral-embed";

interface Tarif {
    /** USD per million input tokens. */
    entree: number;
    /** USD per million output tokens. */
    sortie: number;
}

/**
 * Public Mistral rates, checked 2026-09-06 on https://mistral.ai/pricing/api.
 * Note `mistral-medium` costs more than `mistral-large` — counter-intuitive, but
 * that is the published grid.
 */
const TARIFS: Record<string, Tarif> = {
    "mistral-large-latest": { entree: 0.5, sortie: 1.5 },
    "mistral-medium-latest": { entree: 1.5, sortie: 7.5 },
    "mistral-small-latest": { entree: 0.15, sortie: 0.6 },
    "ministral-14b-latest": { entree: 0.2, sortie: 0.2 },
    "ministral-8b-latest": { entree: 0.15, sortie: 0.15 },
    "ministral-3b-latest": { entree: 0.1, sortie: 0.1 },
    "mistral-embed": { entree: 0.1, sortie: 0 },
};

/** Fallback for an unknown model: the priciest known rate, so we never under-report. */
const TARIF_INCONNU: Tarif = { entree: 1.5, sortie: 7.5 };

/**
 * Cost in USD of one call. Derived at read time rather than stored, so a rate
 * change never leaves stale figures in the database.
 */
export function coutUsd(modele: string, tokensEntree: number, tokensSortie: number): number {
    const tarif = TARIFS[modele] ?? TARIF_INCONNU;
    return (tokensEntree * tarif.entree + tokensSortie * tarif.sortie) / 1_000_000;
}

/** Indicative USD→EUR rate. Display only — the Mistral invoice stays in USD. */
export const TAUX_USD_EUR = 0.92;

/**
 * Monthly spending cap set on the Mistral workspace (Admin Panel › Subscription).
 * Mirrored here only to draw the gauge — Mistral is the authority: past this
 * amount the API answers 429 and every agent stops, whatever this constant says.
 */
export const PLAFOND_MENSUEL_USD = Number(process.env.MISTRAL_PLAFOND_USD ?? 10);
