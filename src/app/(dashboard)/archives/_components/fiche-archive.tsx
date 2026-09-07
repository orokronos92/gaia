import Link from "next/link"
import { ExternalLink } from "lucide-react"

import type { InferSelectModel } from "drizzle-orm"
import type { produits } from "@/db/schema"

type Produit = InferSelectModel<typeof produits>

interface FicheArchiveProps {
    produit: Produit
    auteur?: string
    /** Fiche to open to see everything: recette, documents source, versions. */
    ficheId?: string
}

/** Fields worth showing to judge, at a glance, what this product was. */
const CHAMPS: { cle: keyof Produit; libelle: string }[] = [
    { cle: "gamme", libelle: "Gamme" },
    { cle: "sousGamme", libelle: "Sous-gamme" },
    { cle: "typeTheFr", libelle: "Type" },
    { cle: "origine", libelle: "Origine" },
    { cle: "poidsNet", libelle: "Poids net" },
    { cle: "codeEan", libelle: "EAN" },
    { cle: "tempsInfusion", libelle: "Temps d'infusion" },
    { cle: "tempInfusion", libelle: "Température" },
    { cle: "nbTasses", libelle: "Nombre de tasses" },
    { cle: "conditionnement", libelle: "Conditionnement" },
]

export function FicheArchive({ produit, auteur, ficheId }: FicheArchiveProps) {
    const renseignes = CHAMPS.filter((c) => {
        const v = produit[c.cle]
        return typeof v === "string" && v.trim() !== ""
    })

    return (
        <details className="group rounded-2xl border border-stone-200/70 bg-white shadow-sm overflow-hidden">
            <summary className="flex flex-wrap items-center gap-x-4 gap-y-2 p-5 cursor-pointer list-none hover:bg-stone-50/70">
                <span className="font-mono text-xs px-2 py-1 rounded-md bg-stone-100 text-stone-600 shrink-0">
                    {produit.refArchive ?? "—"}
                </span>
                <span className="font-semibold text-stone-800">{produit.denominationFr}</span>
                <span className="font-mono text-sm text-stone-400">{produit.codePf}</span>
                <span className="ml-auto text-xs text-stone-400">
                    archivé le {produit.archiveLe?.toLocaleDateString("fr-FR")}
                    {auteur ? ` par ${auteur}` : ""}
                </span>
            </summary>

            <div className="border-t border-stone-100 p-5 space-y-5">
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1">
                        Motif
                    </div>
                    <p className="text-sm text-stone-700">{produit.motifArchivage ?? "—"}</p>
                </div>

                {renseignes.length > 0 && (
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-2">
                            Données conservées
                        </div>
                        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
                            {renseignes.map((c) => (
                                <div key={String(c.cle)}>
                                    <dt className="text-xs text-stone-400">{c.libelle}</dt>
                                    <dd className="text-sm text-stone-800">{String(produit[c.cle])}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}

                {ficheId && (
                    <Link
                        href={`/etiquettes/${ficheId}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Ouvrir la fiche complète — recette, documents source, versions
                    </Link>
                )}
            </div>
        </details>
    )
}
