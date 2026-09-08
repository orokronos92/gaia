"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth } from "@/auth"
import { writeAuditLog } from "@/db/queries/audit-logs"
import { getFicheProduitId } from "@/db/queries/fiches"
import { poserValidation, retirerValidation } from "@/db/queries/validations-controle"
import { DECISIONS, empreinteConstat, refusMotif } from "@/lib/audit/validation"
import { chargerChecklist } from "./_checklist"

const ValiderSchema = z.object({
    ficheId: z.string().uuid(),
    pointId: z.string().min(1).max(16),
    decision: z.enum(DECISIONS),
    justification: z.string().max(2000).optional(),
})

const RetirerSchema = z.object({
    ficheId: z.string().uuid(),
    pointId: z.string().min(1).max(16),
})

export interface ValidationResult {
    ok: boolean
    error?: string
}

/**
 * Enregistre la décision de la Qualité sur un point de contrôle.
 *
 * L'empreinte du constat est **recalculée ici**, jamais reçue du client : sinon
 * n'importe quel appelant pourrait figer une ligne sur un constat qu'il aurait
 * inventé, et l'application certifierait ce qu'elle n'a pas vu.
 *
 * Auth + Zod d'abord (CLAUDE.md §8).
 */
export async function validerPointAction(raw: unknown): Promise<ValidationResult> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: "Non autorisé." }

    const parsed = ValiderSchema.safeParse(raw)
    if (!parsed.success) return { ok: false, error: "Entrée invalide." }
    const { ficheId, pointId, decision } = parsed.data
    const justification = parsed.data.justification?.trim() || null

    const checklist = await chargerChecklist(ficheId)
    if (!checklist) return { ok: false, error: "Fiche introuvable." }

    const point = checklist.find((c) => c.id === pointId)
    if (!point) return { ok: false, error: "Ce point ne s'applique pas à cette fiche." }

    const refus = refusMotif(decision, point.statut, justification)
    if (refus) return { ok: false, error: refus }

    await poserValidation({
        ficheId,
        pointId,
        decision,
        justification,
        empreinte: empreinteConstat(point),
        utilisateurId: session.user.id,
    })

    // La piste d'audit attendue par le client : qui a levé quoi, quand, et sur
    // quel constat. Une dérogation doit rester lisible des années après.
    await writeAuditLog({
        typeEntite: "fiche_etiquette",
        entiteId: ficheId,
        action: decision === "DEROGATION" ? "DEROGATION_CONTROLE" : "VALIDATION_CONTROLE",
        utilisateurId: session.user.id,
        changements: { pointId, statut: point.statut, justification, constat: point.justification },
    })

    const produitId = await getFicheProduitId(ficheId)
    revalidatePath(`/etiquettes/${ficheId}`)
    if (produitId) revalidatePath(`/produits/${produitId}`)
    return { ok: true }
}

/** Retire une décision : le point retourne au travail restant. */
export async function retirerValidationAction(raw: unknown): Promise<ValidationResult> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: "Non autorisé." }

    const parsed = RetirerSchema.safeParse(raw)
    if (!parsed.success) return { ok: false, error: "Entrée invalide." }

    await retirerValidation(parsed.data.ficheId, parsed.data.pointId)
    await writeAuditLog({
        typeEntite: "fiche_etiquette",
        entiteId: parsed.data.ficheId,
        action: "RETRAIT_VALIDATION_CONTROLE",
        utilisateurId: session.user.id,
        changements: { pointId: parsed.data.pointId },
    })

    revalidatePath(`/etiquettes/${parsed.data.ficheId}`)
    return { ok: true }
}
