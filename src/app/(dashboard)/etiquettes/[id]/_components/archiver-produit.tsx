"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Archive, Loader2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { archiverProduitAction } from "@/app/actions/archivage"

interface ArchiverProduitProps {
    produitId: string
    codePf: string
    denomination: string
}

/**
 * Archiving replaces deletion. Confirmation is by RETYPING the product code, not
 * by a yes/no dialog: a dialog gets clicked through without reading, retyping
 * `TA7372` does not. It also makes a bulk archiving visibly deliberate.
 *
 * There is no un-archive, on purpose — the panel says so before the act, not
 * after.
 */
export function ArchiverProduit({ produitId, codePf, denomination }: ArchiverProduitProps) {
    const router = useRouter()
    const [ouvert, setOuvert] = useState(false)
    const [code, setCode] = useState("")
    const [motif, setMotif] = useState("")
    const [pending, startTransition] = useTransition()

    const codeOk = code.trim().toUpperCase() === codePf.trim().toUpperCase()
    const motifOk = motif.trim().length >= 3

    const archiver = () =>
        startTransition(async () => {
            const res = await archiverProduitAction({ produitId, codeSaisi: code, motif })
            if (!res.ok) {
                toast.error(res.error ?? "Archivage impossible.")
                return
            }
            toast.success(`Produit archivé sous la référence ${res.refArchive}.`)
            router.push("/produits")
        })

    if (!ouvert) {
        return (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200/70 bg-white p-5">
                <div>
                    <h3 className="text-sm font-bold text-stone-800">Archiver ce produit</h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                        Le retire du catalogue. Rien n&apos;est supprimé, et le code
                        <span className="font-mono"> {codePf} </span>
                        redevient disponible pour repartir proprement.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setOuvert(true)} className="shrink-0 gap-2">
                    <Archive className="h-4 w-4" />
                    Archiver
                </Button>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 space-y-4">
            <div className="flex gap-3">
                <TriangleAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900 space-y-1">
                    <p className="font-semibold">
                        Archiver « {denomination} » ({codePf}) ?
                    </p>
                    <p>
                        Ses fiches, sa recette et ses documents source sont conservés et restent
                        consultables dans les archives. <strong>Aucun retour n&apos;est possible depuis
                        l&apos;application</strong> — pour reprendre ce produit, il faudra le recréer.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <label className="block">
                    <span className="text-xs font-medium text-stone-600">
                        Motif de l&apos;archivage <span className="text-amber-700">(obligatoire)</span>
                    </span>
                    <input
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                        placeholder="Doublon, erreur d'import, référence abandonnée…"
                        className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
                    />
                </label>

                <label className="block">
                    <span className="text-xs font-medium text-stone-600">
                        Retapez le code produit <span className="font-mono">{codePf}</span> pour confirmer
                    </span>
                    <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder={codePf}
                        className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-amber-400"
                    />
                </label>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    onClick={archiver}
                    disabled={!codeOk || !motifOk || pending}
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                    size="sm"
                >
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                    Archiver définitivement
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setOuvert(false)
                        setCode("")
                        setMotif("")
                    }}
                    disabled={pending}
                >
                    Annuler
                </Button>
            </div>
        </div>
    )
}
