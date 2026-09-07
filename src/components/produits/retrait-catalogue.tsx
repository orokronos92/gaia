"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArchiveRestore, Loader2, PackageMinus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { remettreAuCatalogueAction, retirerDuCatalogueAction } from "@/app/actions/catalogue"

interface RetraitCatalogueProps {
    produitId: string
    codePf: string
    denomination: string
    /** Already withdrawn → the control becomes "put it back". */
    retire: boolean
    variante?: "bloc" | "ligne"
    /** Icon only — three text buttons per table row is too heavy. */
    compact?: boolean
}

/**
 * Withdrawing a product from the catalogue: it is no longer sold, but it stays a
 * reference of the house and comes back in one click. That is why it asks for a
 * reason but not for the code to be retyped — friction should match the stakes,
 * and deletion is the one that cannot be undone.
 */
export function RetraitCatalogue({
    produitId,
    codePf,
    denomination,
    retire,
    variante = "bloc",
    compact = false,
}: RetraitCatalogueProps) {
    const router = useRouter()
    const [ouvert, setOuvert] = useState(false)
    const [motif, setMotif] = useState("")
    const [pending, startTransition] = useTransition()

    const rafraichir = () => {
        setOuvert(false)
        setMotif("")
        router.refresh()
    }

    const remettre = () =>
        startTransition(async () => {
            const res = await remettreAuCatalogueAction({ produitId })
            if (!res.ok) {
                toast.error(res.error ?? "Opération impossible.")
                return
            }
            toast.success(`${codePf} est de nouveau au catalogue.`)
            rafraichir()
        })

    const retirer = () =>
        startTransition(async () => {
            const res = await retirerDuCatalogueAction({ produitId, motif })
            if (!res.ok) {
                toast.error(res.error ?? "Opération impossible.")
                return
            }
            toast.success(`${codePf} retiré du catalogue. Réversible à tout moment.`)
            rafraichir()
        })

    if (retire) {
        const bouton = (
            <Button
                variant={variante === "ligne" ? "ghost" : "outline"}
                size={compact ? "icon" : "sm"}
                onClick={remettre}
                disabled={pending}
                title="Remettre au catalogue"
                aria-label="Remettre au catalogue"
                className={
                    compact
                        ? "h-9 w-9 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                        : "gap-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                }
            >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
                {!compact && "Remettre au catalogue"}
            </Button>
        )

        if (variante === "ligne") return bouton

        return (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200/70 bg-white p-5">
                <div>
                    <h3 className="text-sm font-bold text-stone-800">Produit retiré du catalogue</h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                        Il n&apos;apparaît plus dans le catalogue ni dans le pipeline. Rien n&apos;est
                        perdu, et il peut y revenir immédiatement.
                    </p>
                </div>
                {bouton}
            </div>
        )
    }

    if (!ouvert) {
        if (variante === "ligne") {
            return (
                <Button
                    variant="ghost"
                    size={compact ? "icon" : "sm"}
                    onClick={() => setOuvert(true)}
                    title="Retirer du catalogue"
                    aria-label="Retirer du catalogue"
                    className={
                        compact
                            ? "h-9 w-9 text-stone-500 hover:text-stone-700 hover:bg-stone-100"
                            : "text-stone-500 hover:text-stone-700 hover:bg-stone-100 gap-1.5"
                    }
                >
                    <PackageMinus className="h-4 w-4" />
                    {!compact && "Retirer"}
                </Button>
            )
        }

        return (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200/70 bg-white p-5">
                <div>
                    <h3 className="text-sm font-bold text-stone-800">Retirer du catalogue</h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                        Le produit n&apos;est plus commercialisé. Il sort du catalogue et du pipeline,
                        et revient d&apos;un clic quand vous le souhaitez.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setOuvert(true)} className="shrink-0 gap-2">
                    <PackageMinus className="h-4 w-4" />
                    Retirer
                </Button>
            </div>
        )
    }

    const panneau = (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 space-y-4">
            <div className="text-sm text-stone-800 space-y-1">
                <p className="font-semibold">
                    Retirer « {denomination} » ({codePf}) du catalogue ?
                </p>
                <p className="text-stone-600">
                    Il disparaît du catalogue, du pipeline et des compteurs.{" "}
                    <strong>Ce retrait se défait d&apos;un clic</strong> — pour supprimer réellement le
                    produit, utilisez le bouton rouge.
                </p>
            </div>

            <label className="block">
                <span className="text-xs font-medium text-stone-600">
                    Motif du retrait <span className="text-stone-500">(obligatoire)</span>
                </span>
                <input
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    placeholder="Fin de commercialisation, saison terminée, remplacé par…"
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
                />
            </label>

            <div className="flex items-center gap-2">
                <Button
                    onClick={retirer}
                    disabled={motif.trim().length < 3 || pending}
                    size="sm"
                    className="gap-2"
                >
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageMinus className="h-4 w-4" />}
                    Retirer du catalogue
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setOuvert(false)
                        setMotif("")
                    }}
                    disabled={pending}
                >
                    Annuler
                </Button>
            </div>
        </div>
    )

    if (variante === "ligne") {
        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget && !pending) setOuvert(false)
                }}
            >
                <div className="w-full max-w-lg text-left">{panneau}</div>
            </div>
        )
    }

    return panneau
}
