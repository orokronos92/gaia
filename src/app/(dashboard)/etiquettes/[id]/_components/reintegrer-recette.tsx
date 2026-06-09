"use client"

import { useRef, useTransition, type ChangeEvent } from "react"
import { FileUp, Loader2, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    reintegrerRecetteAction,
    reintegrerDegustationAction,
    type ReintegrerResult,
} from "@/app/actions/import"

interface ReintegrerDocumentMenuProps {
    ficheId: string
}

type Action = (fd: FormData) => Promise<ReintegrerResult>

/**
 * Re-imports a source document into the current fiche (Lot 3 / 3b). Reload
 * overwrites; Marie validates afterwards. Dégustation → produit (overwrite-non-
 * null), Recette → recette tab.
 */
export function ReintegrerDocumentMenu({ ficheId }: ReintegrerDocumentMenuProps) {
    const recetteInput = useRef<HTMLInputElement>(null)
    const degustationInput = useRef<HTMLInputElement>(null)
    const [pending, startTransition] = useTransition()
    const router = useRouter()

    const handle =
        (action: Action, field: string, ok: (r: ReintegrerResult) => string) =>
        (e: ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            e.target.value = "" // allow re-selecting the same file
            if (!file) return
            const fd = new FormData()
            fd.append("ficheId", ficheId)
            fd.append(field, file)
            startTransition(async () => {
                const r = await action(fd)
                if (r.ok) {
                    toast.success(ok(r), { description: "À valider par Marie." })
                    router.refresh()
                } else {
                    toast.error("Échec de la ré-intégration.", { description: r.error })
                }
            })
        }

    return (
        <>
            <input
                ref={degustationInput}
                type="file"
                accept=".docx,.doc"
                className="hidden"
                onChange={handle(
                    reintegrerDegustationAction,
                    "degustation",
                    (r) => `Dégustation ré-intégrée (${r.champsProduit} champ(s) mis à jour).`
                )}
            />
            <input
                ref={recetteInput}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handle(
                    reintegrerRecetteAction,
                    "recette",
                    (r) => `Recette ré-intégrée (${r.nbIngredients} ingrédient(s)).`
                )}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        title="Recharger un document source — écrase la cible"
                        className="bg-white hover:bg-stone-50 border-stone-200 shadow-sm rounded-xl font-medium"
                    >
                        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                        Ré-intégrer
                        <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-60" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); degustationInput.current?.click() }}>
                        Fiche dégustation (Word)
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); recetteInput.current?.click() }}>
                        Fiche recette (Excel)
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
