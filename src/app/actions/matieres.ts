"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"

import { auth } from "@/auth"
import { qualifierMatiere } from "@/db/queries/matieres-premieres"

const QualifierSchema = z.object({
    codeArticle: z.string().min(1),
    denominationLegale: z.string().trim().min(1, "La dénomination légale est requise."),
    estBio: z.boolean(),
    estDemeter: z.boolean(),
    estEquitable: z.boolean(),
})

/**
 * Records the legal name a raw material must carry on the label — the answer the
 * recipe sheet never gives. "TN592 SORWATHE OP1" declares as "Thé noir", and
 * without that nothing can tell whether a substitution changes the printed list.
 */
export async function qualifierMatiereAction(
    raw: unknown
): Promise<{ ok: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: "Non autorisé." }

    const parsed = QualifierSchema.safeParse(raw)
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Entrée invalide." }
    }

    await qualifierMatiere({ ...parsed.data, utilisateurId: session.user.id })
    revalidatePath("/parametres/matieres")
    return { ok: true }
}
