"use server"

import { z } from "zod"

import { auth } from "@/auth"
import { compterResteAFaire, type ResteAFaire } from "@/lib/audit/checklist-complete"
import { chargerChecklist } from "./_checklist"
import { countByStatus, overallStatus, verdictChecklist, type SyntheseChecklist } from "@/lib/audit/synthesis"
import type { ControlResult, ControlStatus } from "@/lib/audit/types"
import type { BatTextCheck } from "@/lib/audit/visual/text-robot"

const AuditDeterministeSchema = z.object({
    ficheId: z.string().uuid(),
})

export interface AuditDeterministeResult {
    ok: boolean
    error?: string
    overallStatus?: ControlStatus
    counts?: Record<ControlStatus, number>
    /** Ce qu'il reste à faire, l'axe que Marie lit en premier. */
    resteAFaire?: ResteAFaire
    /** Constats du BAT que le registre ne porte pas — visibles sans IA. */
    horsChecklist?: BatTextCheck[]
    /** Ce qui a été lu, et d'où : un audit ne vaut que par sa source. */
    faces?: string[]
    dossiers?: string[]
    /**
     * Où en est la fiche — lu sur l'action restante, pas sur le pire statut.
     * `overallStatus` reste rendu pour la synthèse générale, qui compare des
     * voies d'audit entre elles et raisonne bien, elle, sur le constat brut.
     */
    synthese?: SyntheseChecklist
    results?: ControlResult[]
}

/**
 * Checklist de contrôle d'une fiche. Lecture seule.
 *
 * Elle renvoie les 39 points applicables : ceux que le code sait trancher avec
 * leur verdict, et les autres avec ce qu'il reste à faire. Marie doit voir la
 * totalité de son travail sur cette fiche, pas seulement la part automatisable.
 * Auth + Zod d'abord (CLAUDE.md §8).
 */
export async function auditDeterministeAction(raw: unknown): Promise<AuditDeterministeResult> {
    const session = await auth()
    if (!session?.user) return { ok: false, error: "Non autorisé." }

    const parsed = AuditDeterministeSchema.safeParse(raw)
    if (!parsed.success) return { ok: false, error: "Entrée invalide." }

    // La checklist COMPLÈTE : les points déterministes avec leur verdict, ce que
    // les BAT montrent, et les décisions déjà prises par la Qualité. Aucun point
    // du registre ne reste invisible, aucune coche posée n'est perdue.
    const charge = await chargerChecklist(parsed.data.ficheId)
    if (!charge) return { ok: false, error: "Fiche introuvable." }
    const results = charge.resultats
    return {
        ok: true,
        overallStatus: overallStatus(results),
        counts: countByStatus(results),
        resteAFaire: compterResteAFaire(results),
        synthese: verdictChecklist(results),
        results,
        horsChecklist: charge.horsChecklist,
        faces: charge.faces,
        dossiers: charge.dossiers,
    }
}
