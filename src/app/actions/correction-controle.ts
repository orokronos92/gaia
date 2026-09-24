"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth } from "@/auth"
import { writeAuditLog } from "@/db/queries/audit-logs"
import { getFicheProduitId, updateFicheEtiquetteChamps } from "@/db/queries/fiches"
import { updateProduitChamps } from "@/db/queries/produits"
import { CHAMPS_CORRIGEABLES } from "@/lib/audit/correction"
import { estViolationUnicite } from "@/lib/erreurs-postgres"
import { chargerChecklist } from "./_checklist"

const Schema = z.object({
    ficheId: z.string().uuid(),
    pointId: z.string().min(1).max(16),
    valeur: z.string().max(5000),
})

export interface CorrectionResult {
    ok: boolean
    error?: string
}

/**
 * « Corriger la fiche » depuis une carte de contrôle en écart.
 *
 * Seule la valeur vient du navigateur. Le champ et la table sont relus ici, sur
 * le constat recalculé : l'appelant ne peut pas faire écrire un autre champ que
 * celui dont le point parle. La valeur remplacée est gardée au journal d'audit
 * (avant / après), comme pour toute modification de fiche.
 *
 * Auth + Zod d'abord (CLAUDE.md §8).
 */
export async function corrigerDepuisControleAction(raw: unknown): Promise<CorrectionResult> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: "Non autorisé." }

    const parsed = Schema.safeParse(raw)
    if (!parsed.success) return { ok: false, error: "Entrée invalide." }
    const { ficheId, pointId } = parsed.data
    const valeur = parsed.data.valeur.trim()

    const charge = await chargerChecklist(ficheId)
    const correction = charge?.resultats.find((r) => r.id === pointId)?.correction
    if (!correction) return { ok: false, error: "Ce point ne propose plus de correction." }
    const permis: readonly string[] = CHAMPS_CORRIGEABLES[correction.table]
    if (!permis.includes(correction.champ)) return { ok: false, error: "Champ non corrigeable." }
    if (valeur === "" && correction.champ === "denominationFr") {
        return { ok: false, error: "La dénomination ne peut pas être vide." }
    }

    let avant: Record<string, string | null>
    let entiteId: string
    try {
        if (correction.table === "produit") {
            const produitId = await getFicheProduitId(ficheId)
            if (!produitId) return { ok: false, error: "Fiche introuvable." }
            ;({ avant } = await updateProduitChamps(produitId, { [correction.champ]: valeur }))
            entiteId = produitId
        } else {
            ;({ avant } = await updateFicheEtiquetteChamps(ficheId, { [correction.champ]: valeur === "" ? null : valeur }))
            entiteId = ficheId
        }
    } catch (e) {
        if (estViolationUnicite(e)) return { ok: false, error: `« ${valeur} » est déjà porté par un autre produit.` }
        throw e
    }

    await writeAuditLog({
        typeEntite: correction.table === "produit" ? "produit" : "fiche_etiquette",
        entiteId,
        action: "CORRECTION_DEPUIS_CONTROLE",
        utilisateurId: session.user.id,
        changements: { pointId, champ: correction.champ, avant: avant[correction.champ] ?? null, apres: valeur },
    })

    revalidatePath(`/etiquettes/${ficheId}`)
    return { ok: true }
}
