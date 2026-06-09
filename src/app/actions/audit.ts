"use server"

import { z } from "zod"

import { auth } from "@/auth"
import { getAuditInputForFiche } from "@/db/queries/audit"
import { auditDeterministic } from "@/lib/audit/deterministic"
import { countByStatus, overallStatus } from "@/lib/audit/synthesis"
import type { ControlResult, ControlStatus } from "@/lib/audit/types"

const AuditDeterministeSchema = z.object({
    ficheId: z.string().uuid(),
})

export interface AuditDeterministeResult {
    ok: boolean
    error?: string
    overallStatus?: ControlStatus
    counts?: Record<ControlStatus, number>
    results?: ControlResult[]
}

/**
 * Voie A (deterministic) audit for a single fiche. Read-only — runs the pure
 * lane on freshly loaded data and returns the verdicts. No DB write yet
 * (persistence comes with the UI / Voie C lot). Auth + Zod first (CLAUDE.md §8).
 */
export async function auditDeterministeAction(raw: unknown): Promise<AuditDeterministeResult> {
    const session = await auth()
    if (!session?.user) return { ok: false, error: "Non autorisé." }

    const parsed = AuditDeterministeSchema.safeParse(raw)
    if (!parsed.success) return { ok: false, error: "Entrée invalide." }

    const input = await getAuditInputForFiche(parsed.data.ficheId)
    if (!input) return { ok: false, error: "Fiche introuvable." }

    const results = auditDeterministic(input)
    return {
        ok: true,
        overallStatus: overallStatus(results),
        counts: countByStatus(results),
        results,
    }
}
