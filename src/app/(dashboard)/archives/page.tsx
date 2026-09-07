import { redirect } from "next/navigation"
import { Archive } from "lucide-react"

import { auth } from "@/auth"
import { getProduitsArchives } from "@/db/queries/produits"
import { getUtilisateursParId } from "@/db/queries/utilisateurs"
import { getFicheIdParProduit } from "@/db/queries/fiches"

import { FicheArchive } from "./_components/fiche-archive"

/**
 * The archive register. Read-only, and there is no un-archive: recovering a
 * product means re-creating it, or an intervention outside the application.
 *
 * Each entry therefore has to carry enough to REBUILD from — codes, weights,
 * infusion parameters, recipe, source documents. A register that only said
 * "TA7372 archived by Marie" would make that promise empty.
 */
export default async function ArchivesPage() {
    const session = await auth()
    if (!session?.user) redirect("/login")

    const archives = await getProduitsArchives()
    const [auteurs, fiches] = await Promise.all([
        getUtilisateursParId(archives.map((a) => a.archivePar).filter((id): id is string => !!id)),
        getFicheIdParProduit(archives.map((a) => a.id)),
    ])

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4">
            <div>
                <h1 className="text-3xl font-light tracking-tight text-emerald-950">Archives</h1>
                <p className="text-sm text-stone-500 font-medium mt-1">
                    Produits retirés du système. Rien n&apos;est supprimé : chaque archive conserve
                    ses données, sa recette et ses documents source.
                </p>
            </div>

            {archives.length === 0 ? (
                <div className="rounded-3xl border border-stone-200/60 bg-white/80 p-16 flex flex-col items-center text-center">
                    <Archive className="h-14 w-14 text-stone-200 mb-4 stroke-[1.5]" />
                    <p className="text-stone-600 font-semibold text-lg">Aucun produit archivé</p>
                    <p className="text-stone-400 text-sm mt-2 max-w-md">
                        L&apos;archivage remplace la suppression : un produit retiré du catalogue
                        apparaît ici, avec son motif et son auteur.
                    </p>
                </div>
            ) : (
                <>
                    <p className="text-sm text-stone-500">
                        {archives.length} produit{archives.length > 1 ? "s" : ""} archivé
                        {archives.length > 1 ? "s" : ""}.
                    </p>
                    <ul className="space-y-4">
                        {archives.map((produit) => (
                            <li key={produit.id}>
                                <FicheArchive
                                    produit={produit}
                                    auteur={produit.archivePar ? auteurs[produit.archivePar] : undefined}
                                    ficheId={fiches[produit.id]}
                                />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    )
}
