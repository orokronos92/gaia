"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Filter } from "lucide-react"

import type { FiltreCatalogue } from "@/db/queries/produits"

const OPTIONS: { valeur: FiltreCatalogue; libelle: string }[] = [
    { valeur: "actifs", libelle: "Au catalogue" },
    { valeur: "retires", libelle: "Retirés du catalogue" },
    { valeur: "tous", libelle: "Tous" },
]

/**
 * Replaces the dead "Filtres Avancés" button. Withdrawn products leave the
 * catalogue but stay in the application — this is how they are found again, and
 * put back.
 */
export function FiltreCatalogueSelect({ valeur }: { valeur: FiltreCatalogue }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const changer = (suivant: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (suivant === "actifs") params.delete("catalogue")
        else params.set("catalogue", suivant)
        router.push(`/produits${params.toString() ? `?${params}` : ""}`)
    }

    return (
        <div className="flex items-center gap-2 rounded-full bg-white/60 backdrop-blur-md shadow-sm border border-stone-200/50 pl-4 pr-2 py-1.5">
            <Filter className="h-4 w-4 text-stone-500 shrink-0" />
            <select
                value={valeur}
                onChange={(e) => changer(e.target.value)}
                className="bg-transparent text-sm font-medium text-stone-700 outline-none cursor-pointer pr-1"
            >
                {OPTIONS.map((o) => (
                    <option key={o.valeur} value={o.valeur}>
                        {o.libelle}
                    </option>
                ))}
            </select>
        </div>
    )
}
