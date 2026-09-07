"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"

import { auth } from "@/auth"
import { archiverProduit } from "@/db/queries/produits"
import { writeAuditLog } from "@/db/queries/audit-logs"

/**
 * Archiving is confirmed by RETYPING the product code, not by a yes/no dialog.
 * A dialog gets clicked through; typing `TA7372` does not. It costs a legitimate
 * gesture three seconds and makes a bulk archiving visibly deliberate.
 */
const ArchiverSchema = z.object({
    produitId: z.string().uuid(),
    codeSaisi: z.string().min(1),
    motif: z.string().trim().min(3, "Indiquez le motif de l'archivage."),
})

export interface ArchiverResult {
    ok: boolean
    error?: string
    refArchive?: string
}

/**
 * Archives a product — the application's replacement for deletion. Nothing is
 * destroyed: fiches, recettes, source documents and BAT links stay attached, and
 * the act is recorded with its author and reason.
 *
 * There is deliberately no un-archive action. Recovery, if it ever matters, is
 * an intervention outside the application — that is what makes this a register
 * rather than a recycle bin.
 */
export async function archiverProduitAction(raw: unknown): Promise<ArchiverResult> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: "Non autorisé." }

    const parsed = ArchiverSchema.safeParse(raw)
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrée invalide." }
    }

    try {
        // The typed code is verified server-side inside the transaction, before
        // anything is written — a client can always send whatever it likes.
        const resultat = await archiverProduit({
            produitId: parsed.data.produitId,
            utilisateurId: session.user.id,
            motif: parsed.data.motif,
            codeSaisi: parsed.data.codeSaisi,
        })

        await writeAuditLog({
            typeEntite: "produit",
            entiteId: resultat.codePf,
            action: "PRODUIT_ARCHIVE",
            utilisateurId: session.user.id,
            changements: {
                refArchive: resultat.refArchive,
                denomination: resultat.denomination,
                motif: parsed.data.motif,
            },
        })

        revalidatePath("/produits")
        revalidatePath("/etiquettes")
        revalidatePath("/archives")
        return { ok: true, refArchive: resultat.refArchive }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Archivage impossible." }
    }
}
