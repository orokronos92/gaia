"use client"

import { useRef, useTransition, type ChangeEvent } from "react"
import { FileUp, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { reintegrerRecetteAction } from "@/app/actions/import"

interface ReintegrerRecetteButtonProps {
    ficheId: string
}

/**
 * Re-imports the recette Excel into the current fiche (Lot 3). Reload overwrites
 * the recette; Marie validates afterwards. Dégustation re-import (overwriting the
 * produit) is the remaining half — not wired here yet.
 */
export function ReintegrerRecetteButton({ ficheId }: ReintegrerRecetteButtonProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [pending, startTransition] = useTransition()
    const router = useRouter()

    const onFile = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = "" // allow re-selecting the same file
        if (!file) return
        const fd = new FormData()
        fd.append("ficheId", ficheId)
        fd.append("recette", file)
        startTransition(async () => {
            const r = await reintegrerRecetteAction(fd)
            if (r.ok) {
                toast.success(`Recette ré-intégrée (${r.nbIngredients} ingrédient(s)).`, {
                    description: "L'onglet recette a été écrasé — à valider par Marie.",
                })
                router.refresh()
            } else {
                toast.error("Échec de la ré-intégration.", { description: r.error })
            }
        })
    }

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={onFile}
            />
            <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => inputRef.current?.click()}
                title="Recharger la fiche recette (Excel) — écrase la recette actuelle"
                className="bg-white hover:bg-stone-50 border-stone-200 shadow-sm rounded-xl font-medium"
            >
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                Ré-intégrer la recette
            </Button>
        </>
    )
}
