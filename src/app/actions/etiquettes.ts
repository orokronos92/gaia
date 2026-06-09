"use server"

import { z } from "zod"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { db } from "@/db"
import { fichesEtiquettes } from "@/db/schema"
import { auth } from "@/auth"
import { setAllegationChoisie, dupliquerFiche, creerVersionFiche, restaurerVersionFiche, getVersionSnapshot } from "@/db/queries/fiches"
import { writeAuditLog } from "@/db/queries/audit-logs"
import { AuditWorker } from "@/agents/audit/auditWorker"

const ChoisirAllegationSchema = z.object({
    ficheId: z.string().uuid(),
    libelle: z.string().min(1),
    nbTasses: z.string().nullable(),
})

/**
 * Marie selects a health claim for a fiche (editable-fiche pattern, phase 1).
 * Auth + Zod, delegates the write to the queries layer, logs the change to the
 * audit trail, and revalidates so « Données complémentaires » reflects the choice.
 */
export async function choisirAllegationAction(input: unknown) {
    const data = ChoisirAllegationSchema.parse(input)

    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const { avant } = await setAllegationChoisie({
        ficheId: data.ficheId,
        allegationChoisie: data.libelle,
        nbTassesAllegation: data.nbTasses,
    })

    await writeAuditLog({
        typeEntite: "fiche_etiquette",
        entiteId: data.ficheId,
        action: "ALLEGATION_CHOISIE",
        utilisateurId: session.user.id,
        changements: {
            champ: "allegationChoisie",
            avant: avant.allegationChoisie,
            apres: data.libelle,
            nbTasses: data.nbTasses,
        },
    })

    revalidatePath(`/etiquettes/${data.ficheId}`)
    return { ok: true as const }
}

const DupliquerSchema = z.object({
    ficheId: z.string().uuid(),
    nouveauTitre: z.string().min(1, "Le titre est requis").max(255),
})

/**
 * Duplicates a fiche into a brand-new product + fiche + recette (editable-fiche).
 * Marie starts from an existing fiche to build a new product with a new title;
 * the source stays intact. Auth + Zod, delegates the clone to the queries layer,
 * logs it, and returns the new fiche id (the client navigates to it).
 */
export async function dupliquerFicheAction(input: unknown) {
    const data = DupliquerSchema.parse(input)

    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const { nouvelleFicheId, nouveauProduitId } = await dupliquerFiche({
        ficheId: data.ficheId,
        nouveauTitre: data.nouveauTitre.trim(),
    })

    await writeAuditLog({
        typeEntite: "fiche_etiquette",
        entiteId: nouvelleFicheId,
        action: "FICHE_DUPLIQUEE",
        utilisateurId: session.user.id,
        changements: {
            sourceFicheId: data.ficheId,
            nouveauProduitId,
            nouveauTitre: data.nouveauTitre.trim(),
        },
    })

    return { ok: true as const, nouvelleFicheId }
}

const SauvegarderVersionSchema = z.object({
    ficheId: z.string().uuid(),
    resume: z.string().max(255).optional(),
})

/**
 * Saves the fiche's current state as a new version snapshot (editable-fiche, the
 * "Sauvegarder" action). Per-card edits already persist; this records a point in
 * time for history / legislation changes. Auth + Zod, delegates to the queries
 * layer, logs it, returns the new version number.
 */
export async function sauvegarderVersionAction(input: unknown) {
    const { ficheId, resume } = SauvegarderVersionSchema.parse(input)

    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const { versionId, numeroVersion } = await creerVersionFiche({
        ficheId,
        utilisateurId: session.user.id,
        resume: resume && resume.trim() !== "" ? resume.trim() : null,
    })

    await writeAuditLog({
        typeEntite: "fiche_etiquette",
        entiteId: ficheId,
        action: "VERSION_CREEE",
        utilisateurId: session.user.id,
        changements: { versionId, numeroVersion },
    })

    revalidatePath(`/etiquettes/${ficheId}`)
    return { ok: true as const, numeroVersion }
}

const RestaurerSchema = z.object({ versionId: z.string().uuid() })

/**
 * Restores a version snapshot into the live fiche (label content). Auth + Zod,
 * delegates to the queries layer, logs it, revalidates. Marie should save the
 * current state as a version first if she wants to keep it.
 */
export async function restaurerVersionAction(input: unknown) {
    const { versionId } = RestaurerSchema.parse(input)

    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const { ficheId, numeroVersion } = await restaurerVersionFiche(versionId)

    await writeAuditLog({
        typeEntite: "fiche_etiquette",
        entiteId: ficheId,
        action: "VERSION_RESTAUREE",
        utilisateurId: session.user.id,
        changements: { versionId, numeroVersion },
    })

    revalidatePath(`/etiquettes/${ficheId}`)
    return { ok: true as const, numeroVersion }
}

const AuditerVersionSchema = z.object({ versionId: z.string().uuid() })

/**
 * Re-audits a saved version against today's rules (versioning / legislation).
 * Reads the snapshot server-side, runs the audit on its data WITHOUT persisting,
 * and returns the report. Auth + Zod.
 */
export async function auditerVersionAction(input: unknown) {
    const { versionId } = AuditerVersionSchema.parse(input)

    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    const snap = await getVersionSnapshot(versionId)
    if (!snap?.fiche) throw new Error("Snapshot de version introuvable")

    try {
        const controls = await AuditWorker.auditerSnapshot(snap.fiche, snap.produit ?? {})
        const hasFail = controls.some((c) => c.statut === "FAIL")
        const hasWarn = controls.some((c) => c.statut === "WARNING")
        const overallStatus = hasFail ? "FAIL" : hasWarn ? "WARNING" : "PASS"

        await writeAuditLog({
            typeEntite: "version_etiquette",
            entiteId: versionId,
            action: "VERSION_RE_AUDITEE",
            utilisateurId: session.user.id,
            changements: { overallStatus },
        })

        return { ok: true as const, overallStatus, controls }
    } catch (e) {
        return {
            ok: false as const,
            error: e instanceof Error ? e.message : "Audit IA indisponible",
        }
    }
}

export async function createFicheEtiquette(formData: FormData) {
    const produitId = formData.get("produitId") as string;

    if (!produitId) {
        throw new Error("Produit ID manquant");
    }

    // Créer la fiche
    const [nouvelleFiche] = await db.insert(fichesEtiquettes)
        .values({
            produitId,
            statut: "QUALITY_REVIEW",
        })
        .returning({ id: fichesEtiquettes.id });

    // Rediriger vers la page de détail
    redirect(`/etiquettes/${nouvelleFiche.id}`);
}
