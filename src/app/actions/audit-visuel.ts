"use server"

import { z } from "zod"

import { auth } from "@/auth"
import { getBatTextInputForFiche } from "@/db/queries/audit"
import { runTextRobot, type BatTextCheck } from "@/lib/audit/visual/text-robot"
import { countByStatus, overallStatus } from "@/lib/audit/synthesis"
import type { ControlStatus } from "@/lib/audit/types"
import { extractBatText } from "@/lib/utils/bat-text"
import { findFileKeysByPrefix } from "@/lib/utils/s3-client"

const AuditVisuelSchema = z.object({
    ficheId: z.string().uuid(),
})

export interface AuditVisuelTexteResult {
    ok: boolean
    error?: string
    /** File names of the BAT faces actually read. */
    faces?: string[]
    overallStatus?: ControlStatus
    counts?: Record<ControlStatus, number>
    checks?: BatTextCheck[]
}

/**
 * Visual audit — text robot lane for a single fiche. Read-only: locates the
 * product's BAT PDFs in MinIO, extracts and concatenates their text (all
 * faces), and compares it to the validated fiche. No DB write yet (persistence
 * is a later lot). Auth + Zod first (CLAUDE.md §8).
 */
export async function auditVisuelTexteAction(raw: unknown): Promise<AuditVisuelTexteResult> {
    const session = await auth()
    if (!session?.user) return { ok: false, error: "Non autorisé." }

    const parsed = AuditVisuelSchema.safeParse(raw)
    if (!parsed.success) return { ok: false, error: "Entrée invalide." }

    const data = await getBatTextInputForFiche(parsed.data.ficheId)
    if (!data) return { ok: false, error: "Fiche introuvable." }

    const keys = (await findFileKeysByPrefix(data.codePf)).filter((k) =>
        k.toLowerCase().endsWith(".pdf")
    )
    if (keys.length === 0) {
        return { ok: false, error: "Aucun BAT PDF trouvé pour ce produit dans MinIO." }
    }

    const faces: string[] = []
    const texts: string[] = []
    for (const key of keys) {
        try {
            texts.push(await extractBatText(key))
            faces.push(key.split("/").pop() ?? key)
        } catch {
            // Unreadable PDF (vectorised / corrupt) — skip; absence shows in `faces`.
        }
    }
    if (texts.length === 0) {
        return { ok: false, error: "BAT trouvés mais texte non extractible." }
    }

    const checks = runTextRobot(texts.join("\n\n"), data.input)
    return {
        ok: true,
        faces,
        overallStatus: overallStatus(checks),
        counts: countByStatus(checks),
        checks,
    }
}
