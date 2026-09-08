"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth } from "@/auth"
import { writeAuditLog } from "@/db/queries/audit-logs"
import { getBatTextInputForFiche } from "@/db/queries/audit"
import { updateFicheEtiquetteChamps } from "@/db/queries/fiches"
import { updateProduitChamps } from "@/db/queries/produits"
import { chargerChecklist } from "./_checklist"

const Schema = z.object({
    ficheId: z.string().uuid(),
    pointId: z.string().min(1).max(16),
})

export interface PropositionResult {
    ok: boolean
    error?: string
    valeur?: string
}

/**
 * Enregistre sur la fiche une valeur que le BAT porte et qu'elle n'avait pas.
 *
 * La valeur n'est **pas reçue du client** : elle est relue depuis le BAT, ici,
 * au moment d'écrire. Autrement l'appelant pourrait faire enregistrer n'importe
 * quoi sous couvert d'une proposition, et le contrôle qui compare ensuite la
 * fiche au BAT validerait sa propre invention.
 *
 * Le clic reste l'acte de la Qualité : il est daté, signé, et journalisé.
 */
export async function appliquerPropositionAction(raw: unknown): Promise<PropositionResult> {
    const session = await auth()
    if (!session?.user?.id) return { ok: false, error: "Non autorisé." }

    const parsed = Schema.safeParse(raw)
    if (!parsed.success) return { ok: false, error: "Entrée invalide." }
    const { ficheId, pointId } = parsed.data

    const charge = await chargerChecklist(ficheId)
    const point = charge?.resultats.find((c) => c.id === pointId)
    if (!point?.proposition) {
        return { ok: false, error: "Plus aucune valeur à proposer sur ce point." }
    }

    const data = await getBatTextInputForFiche(ficheId)
    if (!data) return { ok: false, error: "Fiche introuvable." }

    // Le poids net vit sur le produit et vaut pour toutes ses fiches ; le code
    // étiquette vit sur la fiche, et lui seul. Écrire les deux au même endroit
    // donnerait le même code à tous les conditionnements d'un thé.
    const { table, champ, valeur } = point.proposition
    let avant: Record<string, string | null>
    try {
        ;({ avant } =
            table === "fiche"
                ? await updateFicheEtiquetteChamps(ficheId, { [champ]: valeur })
                : await updateProduitChamps(data.produitId, { [champ]: valeur }))
    } catch (e) {
        if (typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === "23505") {
            return { ok: false, error: `« ${valeur} » est déjà enregistré sur une autre fiche.` }
        }
        throw e
    }

    await writeAuditLog({
        typeEntite: table === "fiche" ? "fiche_etiquette" : "produit",
        entiteId: table === "fiche" ? ficheId : data.codePf,
        action: "PROPOSITION_BAT_APPLIQUEE",
        utilisateurId: session.user.id,
        changements: { table, champ, avant: avant[champ] ?? null, apres: valeur, source: point.proposition.source },
    })

    revalidatePath(`/etiquettes/${ficheId}`)
    revalidatePath(`/produits/${data.produitId}`)
    return { ok: true, valeur }
}
