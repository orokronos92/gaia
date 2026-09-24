import { cn } from "@/lib/utils"
import type { EditableSection } from "@/components/etiquettes/editable-section"

/**
 * Ce qu'on affiche à la place d'un champ vide.
 *
 * Un champ masqué quand il est vide n'existe pas : personne ne sait qu'il
 * existe, donc personne ne le remplit — et la structure de la page change d'un
 * produit à l'autre sans qu'on comprenne pourquoi. Le vide se dit.
 */
export const NonRenseigne = () => (
    <span className="font-normal italic text-stone-400">non renseigné</span>
)

/** Un champ "vide" au sens de l'Excel : « / », « néant », « n/a »… */
export const hasRealValue = (val: string | null | undefined) => {
    if (!val) return false
    const clean = val.trim().toLowerCase()
    return !["/", "aucun", "néant", "non", "n/a", "na", "", "-"].includes(clean)
}

export const valeurOu = (val: string | null | undefined) =>
    hasRealValue(val) ? val : <NonRenseigne />

/**
 * Un champ du dossier : libellé court au-dessus, valeur en dessous.
 *
 * En lecture il dit « non renseigné » plutôt que de disparaître ; en édition il
 * devient une saisie. Le rendre visible sans le rendre saisissable ne faisait
 * que la moitié du chemin : Marie voyait ce qui manque sans pouvoir le combler.
 */
export function ChampPmi({ label, field, value, section, tonLabel = "text-blue-500", tonValeur = "text-blue-950", placeholder }: {
    label: string
    field: string
    value: string | null | undefined
    section: EditableSection
    tonLabel?: string
    tonValeur?: string
    placeholder?: string
}) {
    return (
        <div>
            <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-0.5", tonLabel)}>{label}</p>
            {section.editing ? (
                <input
                    type="text"
                    value={section.draft[field] ?? ""}
                    onChange={(e) => section.setField(field, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-b border-emerald-300 text-xs font-semibold text-stone-800 focus:border-emerald-500 focus:outline-none"
                />
            ) : (
                <p className={cn("text-xs font-semibold", tonValeur)}>{valeurOu(value)}</p>
            )}
        </div>
    )
}
