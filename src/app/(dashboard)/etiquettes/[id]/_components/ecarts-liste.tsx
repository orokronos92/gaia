import type { EcartListe } from "@/lib/audit/visual/comparaison-liste"
import type { ComparaisonListe } from "@/lib/audit/visual/coherence-liste"

interface EcartsListeProps {
    comparaison: ComparaisonListe
}

const ABSENT = "absent"

/** Une ligne du face-à-face : ce que dit la fiche, ce qu'imprime l'étiquette. */
function cellules(e: EcartListe): { fiche: string | null; etiquette: string | null; note?: string } {
    switch (e.type) {
        case "different":
            return { fiche: e.fiche, etiquette: e.etiquette }
        case "manque":
            return { fiche: e.fiche, etiquette: null }
        case "en_plus":
            return { fiche: null, etiquette: e.etiquette }
        case "ordre":
            return { fiche: e.element, etiquette: e.element, note: `${e.rangFiche}ᵉ sur la fiche, ${e.rangEtiquette}ᵉ sur l'étiquette` }
    }
}

/**
 * Le face-à-face de la liste d'ingrédients — seulement ce qui diverge.
 *
 * Les lignes identiques ne s'affichent pas : Marie lit le problème, pas la
 * liste. Leur nombre reste dit, pour qu'elle sache que le reste a été comparé.
 */
export function EcartsListe({ comparaison }: EcartsListeProps) {
    const { ecarts, total, source } = comparaison
    const touchesFiche = ecarts.filter((e) => e.type !== "en_plus").length
    const identiques = Math.max(0, total - touchesFiche)

    return (
        <div className="mt-2 rounded-xl border border-stone-200 overflow-hidden">
            <div className="grid grid-cols-2 bg-stone-50 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                <span className="px-3 py-1.5">Fiche — {source}</span>
                <span className="px-3 py-1.5 border-l border-stone-200">Étiquette imprimée (BAT)</span>
            </div>
            {ecarts.map((e, i) => {
                const c = cellules(e)
                return (
                    <div key={i} className="grid grid-cols-2 border-t border-stone-100 text-xs leading-snug">
                        <span className="px-3 py-1.5 text-stone-800">
                            {c.fiche ?? <em className="text-stone-400">{ABSENT}</em>}
                        </span>
                        <span className="px-3 py-1.5 border-l border-stone-100 text-red-700 font-medium">
                            {c.etiquette ?? <em className="text-stone-400 font-normal">{ABSENT}</em>}
                            {c.note && <span className="block text-[10px] font-normal text-stone-500">{c.note}</span>}
                        </span>
                    </div>
                )
            })}
            {identiques > 0 && (
                <p className="border-t border-stone-100 px-3 py-1 text-[10px] text-stone-400">
                    {identiques} autre{identiques > 1 ? "s" : ""} ingrédient{identiques > 1 ? "s" : ""} identique{identiques > 1 ? "s" : ""}
                </p>
            )}
        </div>
    )
}
