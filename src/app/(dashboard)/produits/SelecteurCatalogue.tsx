"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Library } from "lucide-react"

import { CATALOGUES, CATALOGUE_PAR_DEFAUT, LIBELLE_CATALOGUE, type Catalogue } from "@/lib/catalogues"

interface SelecteurCatalogueProps {
    valeur: Catalogue
    /** Products per catalogue; an empty catalogue is shown as "à venir". */
    effectifs: Partial<Record<Catalogue, number>>
}

/**
 * The first choice on the product screen: which of JDG's four catalogues to
 * work on. Ranges belong to a catalogue, so switching drops the range filter.
 */
export function SelecteurCatalogue({ valeur, effectifs }: SelecteurCatalogueProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const changer = (suivant: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete("gamme")
        params.delete("sousGamme")
        if (suivant === CATALOGUE_PAR_DEFAUT) params.delete("cat")
        else params.set("cat", suivant)
        router.push(`/produits${params.toString() ? `?${params}` : ""}`)
    }

    return (
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 py-1.5 pl-4 pr-2 shadow-sm backdrop-blur-md">
            <Library className="h-4 w-4 shrink-0 text-emerald-700" />
            <select
                aria-label="Catalogue"
                value={valeur}
                onChange={(e) => changer(e.target.value)}
                className="cursor-pointer bg-transparent pr-1 text-sm font-semibold text-emerald-900 outline-none"
            >
                {CATALOGUES.map((c) => {
                    const n = effectifs[c] ?? 0
                    return (
                        <option key={c} value={c} disabled={n === 0}>
                            {LIBELLE_CATALOGUE[c]} {n > 0 ? `(${n})` : "— à venir"}
                        </option>
                    )
                })}
            </select>
        </div>
    )
}
