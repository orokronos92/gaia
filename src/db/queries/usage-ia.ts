import { and, desc, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { usageIa } from "@/db/schema";

type AgentIA = (typeof usageIa.$inferSelect)["agent"];

export interface UsageEntry {
    agent: AgentIA;
    modele: string;
    tokensEntree: number;
    tokensSortie: number;
    /** Business entity the call related to (codePf, fiche id...), when known. */
    entiteId?: string;
    utilisateurId?: string;
}

/**
 * Records one LLM call. Best-effort by design, exactly like `writeAuditLog`:
 * accounting must NEVER break a user-facing action, so a failure here is
 * swallowed. An import that crashes because the usage table is unreachable
 * would be a cure worse than the disease.
 */
export async function recordUsage(entry: UsageEntry): Promise<void> {
    try {
        await db.insert(usageIa).values({
            agent: entry.agent,
            modele: entry.modele,
            tokensEntree: entry.tokensEntree,
            tokensSortie: entry.tokensSortie,
            entiteId: entry.entiteId?.slice(0, 255),
            utilisateurId: entry.utilisateurId,
        });
    } catch (error) {
        console.error("[usage-ia] enregistrement impossible:", error);
    }
}

/** First day of the current month, local time — the Mistral budget resets then. */
function debutDuMois(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

export interface UsageParAgent {
    agent: AgentIA;
    modele: string;
    appels: number;
    tokensEntree: number;
    tokensSortie: number;
}

/**
 * Usage grouped by agent AND model since `depuis`. Grouping by model matters:
 * rates differ per model, so the caller can only price the total correctly if
 * the split is preserved. Cost itself is computed by the caller via
 * `coutUsd()` — see `src/agents/models.ts`.
 */
export async function getUsageParAgent(depuis: Date = debutDuMois()): Promise<UsageParAgent[]> {
    const rows = await db
        .select({
            agent: usageIa.agent,
            modele: usageIa.modele,
            appels: sql<number>`count(*)::int`,
            tokensEntree: sql<number>`coalesce(sum(${usageIa.tokensEntree}), 0)::int`,
            tokensSortie: sql<number>`coalesce(sum(${usageIa.tokensSortie}), 0)::int`,
        })
        .from(usageIa)
        .where(gte(usageIa.creeLe, depuis))
        .groupBy(usageIa.agent, usageIa.modele);

    return rows;
}

export interface UsageParJour {
    jour: string;
    modele: string;
    tokensEntree: number;
    tokensSortie: number;
}

/** Daily split over the last `jours` days, for the trend chart. */
export async function getUsageParJour(jours = 30): Promise<UsageParJour[]> {
    const depuis = new Date();
    depuis.setDate(depuis.getDate() - jours);

    const rows = await db
        .select({
            jour: sql<string>`to_char(${usageIa.creeLe}, 'YYYY-MM-DD')`,
            modele: usageIa.modele,
            tokensEntree: sql<number>`coalesce(sum(${usageIa.tokensEntree}), 0)::int`,
            tokensSortie: sql<number>`coalesce(sum(${usageIa.tokensSortie}), 0)::int`,
        })
        .from(usageIa)
        .where(gte(usageIa.creeLe, depuis))
        .groupBy(sql`1`, usageIa.modele)
        .orderBy(sql`1`);

    return rows;
}

export interface AppelRecent {
    agent: AgentIA;
    modele: string;
    tokensEntree: number;
    tokensSortie: number;
    entiteId: string | null;
    creeLe: Date;
}

/** Most recent calls, so an unexpected spike can be traced to a real action. */
export async function getAppelsRecents(limite = 20): Promise<AppelRecent[]> {
    return db
        .select({
            agent: usageIa.agent,
            modele: usageIa.modele,
            tokensEntree: usageIa.tokensEntree,
            tokensSortie: usageIa.tokensSortie,
            entiteId: usageIa.entiteId,
            creeLe: usageIa.creeLe,
        })
        .from(usageIa)
        .orderBy(desc(usageIa.creeLe))
        .limit(limite);
}

/**
 * Per-operation averages: how much one import / one full audit actually costs.
 * Counts distinct entities rather than calls, since one import fires several.
 */
export async function getMoyennesParOperation(depuis: Date = debutDuMois()) {
    const rows = await db
        .select({
            famille: sql<string>`split_part(${usageIa.agent}::text, '_', 1)`,
            modele: usageIa.modele,
            operations: sql<number>`count(distinct ${usageIa.entiteId})::int`,
            tokensEntree: sql<number>`coalesce(sum(${usageIa.tokensEntree}), 0)::int`,
            tokensSortie: sql<number>`coalesce(sum(${usageIa.tokensSortie}), 0)::int`,
        })
        .from(usageIa)
        .where(and(gte(usageIa.creeLe, depuis), sql`${usageIa.entiteId} is not null`))
        .groupBy(sql`1`, usageIa.modele);

    return rows;
}
