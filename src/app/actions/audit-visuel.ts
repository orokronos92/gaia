"use server"

import { z } from "zod"

import { auth } from "@/auth"
import { detectPictos } from "@/agents/audit/visual-robot"
import { getBatTextInputForFiche } from "@/db/queries/audit"
import { buildPictoChecks, type Presence } from "@/lib/audit/visual/pictos"
import { runTextRobot, type BatTextCheck } from "@/lib/audit/visual/text-robot"
import { countByStatus, overallStatus } from "@/lib/audit/synthesis"
import type { ControlStatus } from "@/lib/audit/types"
import { extractPdfText } from "@/lib/utils/pdf-text"
import { findFileKeysByPrefix, getObjectBuffer } from "@/lib/utils/s3-client"

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
 * Visual audit for a single fiche. Read-only. Locates the product's BAT PDFs in
 * MinIO, reads each face once, and runs two robots on it:
 *   - text robot (deterministic): printed text ↔ fiche;
 *   - visual robot (pixtral via document_url, no PDF→PNG): logos/pictos, judged
 *     by pure code.
 * Auth + Zod first (CLAUDE.md §8). The visual robot failing (no key / API error)
 * degrades gracefully to text-only — never a fabricated verdict.
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
    const base64s: string[] = []
    for (const key of keys) {
        try {
            const buffer = await getObjectBuffer(key)
            texts.push(await extractPdfText(buffer))
            base64s.push(buffer.toString("base64"))
            faces.push(key.split("/").pop() ?? key)
        } catch {
            // Unreadable face — skip; its absence shows in `faces`.
        }
    }
    if (texts.length === 0) {
        return { ok: false, error: "BAT trouvés mais texte non extractible." }
    }

    const textChecks = runTextRobot(texts.join("\n\n"), data.input)

    // Visual robot — one perception call per face, then aggregate + judge by code.
    const detections: Record<string, Presence>[] = []
    for (const b64 of base64s) {
        try {
            detections.push((await detectPictos(b64)).presences)
        } catch {
            // Vision unavailable (no key / API error) — degrade to text-only.
        }
    }
    const visualChecks = detections.length > 0 ? buildPictoChecks(detections) : []

    const checks = [...textChecks, ...visualChecks]
    return {
        ok: true,
        faces,
        overallStatus: overallStatus(checks),
        counts: countByStatus(checks),
        checks,
    }
}
