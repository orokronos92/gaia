"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"

import { auth } from "@/auth"
import { remettreAuCatalogue, retirerDuCatalogue } from "@/db/queries/produits"
import { writeAuditLog } from "@/db/queries/audit-logs"

const RetirerSchema = z.object({
    produitId: z.string().uuid(),
    motif: z.string().trim().min(3, "Indiquez le motif du retrait."),
})

const RemettreSchema = z.object({ produitId: z.string().uuid() })

export interface CatalogueResult {
    ok: boolean
    error?: string
}

/**
 * Withdraws a product from the catalogue. Unlike deletion this undoes in one
 * click, so it asks for a reason but not for the code to be retyped — the
 * friction should match what is at stake.
 */
export async function retirerDuCatalogueAction(raw: unknown): Promise<CatalogueResult> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: "Non autorisé." }

    const parsed = RetirerSchema.safeParse(raw)
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrée invalide." }
    }

    try {
        const produit = await retirerDuCatalogue({
            produitId: parsed.data.produitId,
            utilisateurId: session.user.id,
            motif: parsed.data.motif,
        })

        await writeAuditLog({
            typeEntite: "produit",
            entiteId: produit.codePf,
            action: "PRODUIT_RETIRE_CATALOGUE",
            utilisateurId: session.user.id,
            changements: { denomination: produit.denomination, motif: parsed.data.motif },
        })

        revalidatePath("/produits")
        revalidatePath("/etiquettes")
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Retrait impossible." }
    }
}

/** Puts a withdrawn product back in the catalogue. The withdrawal stays logged. */
export async function remettreAuCatalogueAction(raw: unknown): Promise<CatalogueResult> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: "Non autorisé." }

    const parsed = RemettreSchema.safeParse(raw)
    if (!parsed.success) return { ok: false, error: "Entrée invalide." }

    try {
        const produit = await remettreAuCatalogue({ produitId: parsed.data.produitId })

        await writeAuditLog({
            typeEntite: "produit",
            entiteId: produit.codePf,
            action: "PRODUIT_REMIS_CATALOGUE",
            utilisateurId: session.user.id,
            changements: {},
        })

        revalidatePath("/produits")
        revalidatePath("/etiquettes")
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Remise au catalogue impossible." }
    }
}
