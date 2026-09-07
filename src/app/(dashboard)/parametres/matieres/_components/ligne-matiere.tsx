"use client"

import { useState, useTransition } from "react"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { qualifierMatiereAction } from "@/app/actions/matieres"
import type { MatierePremiere } from "@/db/queries/matieres-premieres"

/**
 * One raw material to qualify. The recipe sheet gives the R&D wording
 * ("SORWATHE OP1"); the label needs the legal one ("Thé noir"). Nothing but a
 * person can bridge the two, so this is a form, not an inference.
 */
export function LigneMatiere({ matiere }: { matiere: MatierePremiere }) {
    const [denomination, setDenomination] = useState(matiere.denominationLegale ?? "")
    const [bio, setBio] = useState(matiere.estBio)
    const [demeter, setDemeter] = useState(matiere.estDemeter)
    const [equitable, setEquitable] = useState(matiere.estEquitable)
    const [pending, startTransition] = useTransition()

    const qualifiee = !!matiere.denominationLegale
    const modifie =
        denomination !== (matiere.denominationLegale ?? "") ||
        bio !== matiere.estBio ||
        demeter !== matiere.estDemeter ||
        equitable !== matiere.estEquitable

    const enregistrer = () =>
        startTransition(async () => {
            const res = await qualifierMatiereAction({
                codeArticle: matiere.codeArticle,
                denominationLegale: denomination,
                estBio: bio,
                estDemeter: demeter,
                estEquitable: equitable,
            })
            if (res.ok) toast.success(`${matiere.codeArticle} qualifiée.`)
            else toast.error(res.error ?? "Enregistrement impossible.")
        })

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center p-4 rounded-xl border border-stone-200/70 bg-white">
            <div className="lg:col-span-3 min-w-0">
                <div className="font-mono text-xs text-stone-500">{matiere.codeArticle}</div>
                <div className="text-sm font-medium text-stone-800 truncate" title={matiere.designationRd}>
                    {matiere.designationRd}
                </div>
            </div>

            <div className="lg:col-span-4">
                <input
                    value={denomination}
                    onChange={(e) => setDenomination(e.target.value)}
                    placeholder="Dénomination légale — ex. Thé noir"
                    className={
                        "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-400 " +
                        (qualifiee ? "border-stone-200" : "border-amber-300 bg-amber-50/40")
                    }
                />
            </div>

            <div className="lg:col-span-3 flex items-center gap-4 text-xs text-stone-600">
                <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={bio} onChange={(e) => setBio(e.target.checked)} />
                    bio <span className="text-stone-400">*</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={demeter} onChange={(e) => setDemeter(e.target.checked)} />
                    Demeter <span className="text-stone-400">**</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={equitable}
                        onChange={(e) => setEquitable(e.target.checked)}
                    />
                    équitable
                </label>
            </div>

            <div className="lg:col-span-2 flex justify-end">
                <Button
                    size="sm"
                    variant={modifie ? "default" : "ghost"}
                    onClick={enregistrer}
                    disabled={!modifie || pending}
                    className="gap-2"
                >
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Enregistrer
                </Button>
            </div>
        </div>
    )
}
