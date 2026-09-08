"use server"

import { z } from "zod"

import { auth } from "@/auth"
import { auditSemantique } from "@/agents/audit/semantic-robot"
import { contreExaminerPictos, detectPictos } from "@/agents/audit/visual-robot"
import { getBatTextInputForFiche } from "@/db/queries/audit"
import { writeAuditLog } from "@/db/queries/audit-logs"
import { aggregateAll, checksFromPresences, reconcile, type Presence } from "@/lib/audit/visual/pictos"
import { runTextRobot, type BatTextCheck } from "@/lib/audit/visual/text-robot"
import { controlerBat, type FaceBat } from "@/lib/audit/visual/controles-bat"
import { countByStatus, overallStatus } from "@/lib/audit/synthesis"
import type { ControlStatus } from "@/lib/audit/types"
import { analyserBat } from "@/lib/utils/pdf-bat"
import { extractPdfText } from "@/lib/utils/pdf-text"
import { getBatsActifsProduit } from "@/db/queries/fichiers-etiquettes"
import { getObjectBuffer } from "@/lib/utils/s3-client"

const AuditVisuelSchema = z.object({
    ficheId: z.string().uuid(),
})

export interface AuditVisuelTexteResult {
    ok: boolean
    error?: string
    /** File names of the BAT faces actually read. */
    faces?: string[]
    /** MinIO folders those faces came from — the audit is only worth its source. */
    dossiers?: string[]
    overallStatus?: ControlStatus
    counts?: Record<ControlStatus, number>
    checks?: BatTextCheck[]
}

/**
 * Visual audit for a single fiche. Read-only. Reads the BAT files linked to the
 * product in `fichiers_etiquettes`, one pass per face, and runs two robots:
 *   - text robot (deterministic): printed text ↔ fiche;
 *   - visual robot (vision via document_url, no PDF→PNG): logos/pictos, judged
 *     by pure code.
 * Auth + Zod first (CLAUDE.md §8). The visual robot failing (no key / API error)
 * degrades gracefully to text-only — never a fabricated verdict.
 */
export async function auditVisuelTexteAction(raw: unknown): Promise<AuditVisuelTexteResult> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: "Non autorisé." }

    const parsed = AuditVisuelSchema.safeParse(raw)
    if (!parsed.success) return { ok: false, error: "Entrée invalide." }

    const data = await getBatTextInputForFiche(parsed.data.ficheId)
    if (!data) return { ok: false, error: "Fiche introuvable." }

    // The audit reads the stored product ↔ file links, never a name match: an
    // audit is only worth the certainty of what it looked at.
    const bats = await getBatsActifsProduit(data.produitId)
    const keys = bats.map((f) => f.cleS3)
    if (keys.length === 0) {
        return {
            ok: false,
            error: `Aucun BAT actif associé au produit ${data.codePf}. Associez ses fichiers depuis la fiche avant de lancer l'audit.`,
        }
    }
    const dossiers = [...new Set(bats.map((f) => f.dossier))]

    const faces: string[] = []
    const texts: string[] = []
    const base64s: string[] = []
    // Geometry and typography, read from the file itself: trim box, exact point
    // size and font of every word. A face whose deep read fails still gets its
    // text checked — one missing measurement never costs the whole audit.
    const analysees: FaceBat[] = []
    for (const key of keys) {
        try {
            const buffer = await getObjectBuffer(key)
            texts.push(await extractPdfText(buffer))
            base64s.push(buffer.toString("base64"))
            const nom = key.split("/").pop() ?? key
            faces.push(nom)
            try {
                analysees.push({ nom, analyse: await analyserBat(buffer) })
            } catch {
                // Deep read unavailable for this face — typography degrades to
                // "à vérifier", never to an invented measurement.
            }
        } catch {
            // Unreadable face — skip; its absence shows in `faces`.
        }
    }
    if (texts.length === 0) {
        return { ok: false, error: "BAT trouvés mais texte non extractible." }
    }

    const batText = texts.join("\n\n")
    const textChecks = runTextRobot(batText, data.input)

    // Sizes, styles and positions (PRO-QHS-013 §12, §4, §2.3, §3.1, §11.1, §1,
    // §6) — measured on the file, not guessed from a rendering.
    const mesureChecks = controlerBat(analysees, { ...data.input, estDemeter: data.estDemeter })

    // Token accounting per LLM robot (CLAUDE.md §7 — audit trail expected by the
    // client). The deterministic text robot consumes nothing.
    const tokens = { semantique: 0, vision: 0, contreExamen: 0 }

    // Per-call cost attribution (table `usage_ia`) — who ran it, on which product.
    const usageMeta = { entiteId: data.codePf, utilisateurId: session.user.id }

    // Semantic robot (LLM) — free-text elements judged by meaning (allegation…).
    let semanticChecks: BatTextCheck[] = []
    try {
        const semantic = await auditSemantique(batText, data.input, usageMeta)
        semanticChecks = semantic.checks
        tokens.semantique = semantic.tokensUsed
    } catch {
        // LLM unavailable (no key / API error) — skip, never a fabricated verdict.
    }

    // Visual robot — perception per face, then an adversarial counter-exam on the
    // contested logos, reconciled and judged by code (a split opinion → INCERTAIN).
    const detections: Record<string, Presence>[] = []
    for (const b64 of base64s) {
        try {
            const detected = await detectPictos(b64, usageMeta)
            detections.push(detected.presences)
            tokens.vision += detected.tokensUsed
        } catch {
            // Vision unavailable (no key / API error) — degrade to text-only.
        }
    }

    let visualChecks: BatTextCheck[] = []
    if (detections.length > 0) {
        const agg1 = aggregateAll(detections)
        const contested = checksFromPresences(agg1)
            .filter((c) => c.statut === "FAIL" || c.statut === "WARNING")
            .map((c) => c.id.replace("VIS_", ""))

        const finalPresences = { ...agg1 }
        if (contested.length > 0) {
            const counter: Record<string, Presence>[] = []
            for (const b64 of base64s) {
                try {
                    const examined = await contreExaminerPictos(b64, contested, usageMeta)
                    counter.push(examined.presences)
                    tokens.contreExamen += examined.tokensUsed
                } catch {
                    // Counter-exam unavailable — keep the first-pass verdict.
                }
            }
            if (counter.length > 0) {
                const agg2 = aggregateAll(counter)
                for (const cle of contested) finalPresences[cle] = reconcile(agg1[cle], agg2[cle])
            }
        }
        visualChecks = checksFromPresences(finalPresences)
    }

    const checks = [...textChecks, ...mesureChecks, ...semanticChecks, ...visualChecks]

    // Token-usage trail (best-effort; a logging failure never breaks the audit).
    const tokensUsed = tokens.semantique + tokens.vision + tokens.contreExamen
    await writeAuditLog({
        typeEntite: "audit",
        entiteId: data.codePf,
        action: "AUDIT_VISUEL",
        utilisateurId: session.user.id,
        changements: { tokensUsed, parRobot: tokens, faces, dossiers },
    })

    return {
        ok: true,
        faces,
        dossiers,
        overallStatus: overallStatus(checks),
        counts: countByStatus(checks),
        checks,
    }
}
