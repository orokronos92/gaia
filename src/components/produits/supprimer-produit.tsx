"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { archiverProduitAction } from "@/app/actions/archivage"

interface SupprimerProduitProps {
    produitId: string
    codePf: string
    denomination: string
    /** Fiches carried by this product — all of them go, and that must be said. */
    nbFiches?: number
    /** "bloc" on the fiche, "ligne" for the compact action in the product table. */
    variante?: "bloc" | "ligne"
    /** Where to go once the product is gone. */
    redirection?: string
}

/**
 * Deleting a product, from Marie's point of view: it leaves the application and
 * cannot be brought back from it. What actually happens underneath is an
 * archive — nothing is destroyed and direction keeps a signed trail — but that
 * is the Archives screen's story, not this dialog's. Telling her "nothing is
 * deleted" over a Delete button would read as a contradiction.
 *
 * Confirmation is by RETYPING the product code plus a mandatory reason. A yes/no
 * dialog gets clicked through; retyping does not — and the action is now
 * reachable straight from a list.
 */
export function SupprimerProduit({
    produitId,
    codePf,
    denomination,
    nbFiches,
    variante = "bloc",
    redirection = "/produits",
}: SupprimerProduitProps) {
    const router = useRouter()
    const [ouvert, setOuvert] = useState(false)
    const [code, setCode] = useState("")
    const [motif, setMotif] = useState("")
    const [pending, startTransition] = useTransition()

    const codeOk = code.trim().toUpperCase() === codePf.trim().toUpperCase()
    const motifOk = motif.trim().length >= 3

    const supprimer = () =>
        startTransition(async () => {
            const res = await archiverProduitAction({ produitId, codeSaisi: code, motif })
            if (!res.ok) {
                toast.error(res.error ?? "Suppression impossible.")
                return
            }
            toast.success(`${codePf} supprimé. Conservé aux archives sous ${res.refArchive}.`)
            setOuvert(false)
            router.push(redirection)
            router.refresh()
        })

    const fermer = () => {
        setOuvert(false)
        setCode("")
        setMotif("")
    }

    if (!ouvert) {
        if (variante === "ligne") {
            return (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOuvert(true)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
                >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                </Button>
            )
        }

        return (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200/70 bg-white p-5">
                <div>
                    <h3 className="text-sm font-bold text-stone-800">Supprimer ce produit</h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                        Il disparaît du catalogue et de l&apos;application. Le code
                        <span className="font-mono"> {codePf} </span>
                        redevient disponible pour repartir proprement.
                    </p>
                </div>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setOuvert(true)}
                    className="shrink-0 gap-2 bg-red-600 hover:bg-red-700"
                >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                </Button>
            </div>
        )
    }

    const panneau = (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5 space-y-4">
            <div className="flex gap-3">
                <TriangleAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm text-red-900 space-y-1">
                    <p className="font-semibold">
                        Supprimer « {denomination} » ({codePf}) ?
                    </p>
                    <p>
                        <strong>Cette suppression est définitive.</strong> Le produit ne pourra pas
                        être restauré depuis l&apos;application.
                    </p>
                    {typeof nbFiches === "number" && nbFiches > 1 && (
                        <p className="font-medium">
                            Attention : ce produit porte {nbFiches} fiches étiquettes. Toutes
                            disparaîtront du catalogue.
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <label className="block">
                    <span className="text-xs font-medium text-stone-600">
                        Motif de la suppression <span className="text-red-700">(obligatoire)</span>
                    </span>
                    <input
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                        placeholder="Doublon, erreur d'import, référence abandonnée…"
                        className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
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
                        className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-red-400"
                    />
                </label>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    onClick={supprimer}
                    disabled={!codeOk || !motifOk || pending}
                    className="bg-red-600 hover:bg-red-700 text-white gap-2"
                    size="sm"
                >
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Supprimer définitivement
                </Button>
                <Button variant="ghost" size="sm" onClick={fermer} disabled={pending}>
                    Annuler
                </Button>
            </div>
        </div>
    )

    // In a table row the panel cannot expand in place without wrecking the
    // layout, so it opens as an overlay there and inline on the fiche.
    if (variante === "ligne") {
        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget && !pending) fermer()
                }}
            >
                <div className="w-full max-w-lg text-left">{panneau}</div>
            </div>
        )
    }

    return panneau
}
