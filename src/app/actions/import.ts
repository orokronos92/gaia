"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"

import { auth } from "@/auth"
import { getFicheProduitId } from "@/db/queries/fiches"
import { saveRecette } from "@/db/queries/recettes"
import { writeAuditLog } from "@/db/queries/audit-logs"
import { extraireRecetteDepuisXlsx } from "@/agents/imports/recetteExtractor"
import { ImportWorker } from "@/agents/imports/importWorker"

const FicheIdSchema = z.string().uuid()

export interface ReintegrerResult {
    ok: boolean
    error?: string
    nbIngredients?: number
    champsProduit?: number
}

/**
 * Re-imports a recette Excel into an EXISTING fiche (Lot 3). Reload overwrites:
 * the latest recette becomes the new DRAFT (kg from the LLM, % by the engine),
 * which the QUID tab and the differential will read. Marie validates afterwards.
 * Auth + Zod first; the produit id is resolved server-side (never trust the client).
 */
export async function reintegrerRecetteAction(formData: FormData): Promise<ReintegrerResult> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: "Non autorisé." }

    const parsed = FicheIdSchema.safeParse(formData.get("ficheId"))
    if (!parsed.success) return { ok: false, error: "Fiche invalide." }
    const ficheId = parsed.data

    const file = formData.get("recette")
    if (!(file instanceof File) || file.size === 0) {
        return { ok: false, error: "Fichier recette (Excel) manquant." }
    }

    const produitId = await getFicheProduitId(ficheId)
    if (!produitId) return { ok: false, error: "Fiche introuvable." }

    let calc
    try {
        calc = await extraireRecetteDepuisXlsx(await file.arrayBuffer())
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Échec de l'extraction." }
    }
    if (!calc) return { ok: false, error: "Recette non exploitable (kg ou % manquants)." }

    await saveRecette({ produitId, version: "1.0", developpeur: "Ré-import IA", calc })
    await writeAuditLog({
        typeEntite: "fiche",
        entiteId: ficheId,
        action: "RECETTE_REIMPORTEE",
        utilisateurId: session.user.id,
        changements: { nbIngredients: calc.ingredients.length },
    })

    revalidatePath(`/etiquettes/${ficheId}`)
    return { ok: true, nbIngredients: calc.ingredients.length }
}

/**
 * Re-imports the dégustation (Word + optional PDF) into an EXISTING fiche (Lot
 * 3b). Overwrite-non-null on the produit/fiche (a missing field never clobbers
 * an existing value, codePf is preserved); the dégustation row is replaced.
 */
export async function reintegrerDegustationAction(formData: FormData): Promise<ReintegrerResult> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: "Non autorisé." }

    const parsed = FicheIdSchema.safeParse(formData.get("ficheId"))
    if (!parsed.success) return { ok: false, error: "Fiche invalide." }
    const ficheId = parsed.data

    const word = formData.get("degustation")
    if (!(word instanceof File) || word.size === 0) {
        return { ok: false, error: "Fichier dégustation (Word) manquant." }
    }
    const pdf = formData.get("pdf")

    const produitId = await getFicheProduitId(ficheId)
    if (!produitId) return { ok: false, error: "Fiche introuvable." }

    let result
    try {
        result = await ImportWorker.reintegrerDegustation({
            ficheId,
            produitId,
            docxBuffer: await word.arrayBuffer(),
            pdfBuffer: pdf instanceof File && pdf.size > 0 ? await pdf.arrayBuffer() : undefined,
            fichierNom: word.name,
        })
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Échec de l'extraction." }
    }

    await writeAuditLog({
        typeEntite: "fiche",
        entiteId: ficheId,
        action: "DEGUSTATION_REIMPORTEE",
        utilisateurId: session.user.id,
        changements: { champsProduit: result.champsProduit },
    })

    revalidatePath(`/etiquettes/${ficheId}`)
    return { ok: true, champsProduit: result.champsProduit }
}
