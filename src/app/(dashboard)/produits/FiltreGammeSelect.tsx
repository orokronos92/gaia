"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Layers } from "lucide-react"

import type { ChoixGamme } from "@/db/queries/gammes"

/**
 * Filtrer le catalogue par gamme et sous-gamme.
 *
 * La recherche libre trouvait déjà « engagés » dans le nom de la gamme, mais par
 * ressemblance de texte : elle ramenait aussi les deux écritures et rien ne
 * disait laquelle. Ici on choisit dans le référentiel, et la sous-gamme n'offre
 * que celles de la gamme retenue.
 */
export function FiltreGammeSelect({
    choix,
    gamme,
    sousGamme,
}: {
    choix: ChoixGamme[]
    gamme: string
    sousGamme: string
}) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const aller = (maj: (p: URLSearchParams) => void) => {
        const params = new URLSearchParams(searchParams.toString())
        maj(params)
        router.push(`/produits${params.toString() ? `?${params}` : ""}`)
    }

    const courante = choix.find((g) => g.nom === gamme)
    const sousChoix = courante?.sousGammes ?? []

    return (
        <div className="flex items-center gap-2 rounded-full border border-stone-200/50 bg-white/60 py-1.5 pl-4 pr-2 shadow-sm backdrop-blur-md">
            <Layers className="h-4 w-4 shrink-0 text-stone-500" />
            <select
                value={gamme}
                onChange={(e) =>
                    aller((p) => {
                        // Changer de gamme invalide la sous-gamme : elle lui appartient.
                        p.delete("sousGamme")
                        if (e.target.value) p.set("gamme", e.target.value)
                        else p.delete("gamme")
                    })
                }
                aria-label="Filtrer par gamme"
                className="cursor-pointer bg-transparent pr-1 text-sm font-medium text-stone-700 outline-none"
            >
                <option value="">Toutes les gammes</option>
                {choix.map((g) => (
                    <option key={g.id} value={g.nom}>
                        {g.nom}
                    </option>
                ))}
            </select>
            {sousChoix.length > 0 && (
                <select
                    value={sousGamme}
                    onChange={(e) =>
                        aller((p) => {
                            if (e.target.value) p.set("sousGamme", e.target.value)
                            else p.delete("sousGamme")
                        })
                    }
                    aria-label="Filtrer par sous-gamme"
                    className="cursor-pointer border-l border-stone-200 bg-transparent pl-2 pr-1 text-sm font-medium text-stone-700 outline-none"
                >
                    <option value="">Toutes les sous-gammes</option>
                    {sousChoix.map((s) => (
                        <option key={s.id} value={s.nom}>
                            {s.nom}
                        </option>
                    ))}
                </select>
            )}
        </div>
    )
}
