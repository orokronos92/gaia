"use client"

import { useState, useTransition } from "react"
import { Check, Download, Loader2, ShieldAlert, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { appliquerPropositionAction } from "@/app/actions/proposition-fiche"
import {
    retirerValidationAction,
    validerPointAction,
} from "@/app/actions/validation-controle"
import type { ControlResult } from "@/lib/audit/types"

const dateCourte = (d: Date | string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })

interface ValidationLigneProps {
    ficheId: string
    r: ControlResult
    /** Relance la checklist : une décision change ce que l'écran doit montrer. */
    onChange: () => void
}

/**
 * Le geste que la Qualité n'avait pas : clore un point, ou l'assumer.
 *
 * Deux gestes distincts, volontairement. Cocher une alerte, c'est dire « j'ai
 * regardé, c'est bon ». Passer outre une non-conformité prouvée, c'est une
 * dérogation : motif obligatoire, et la ligne reste marquée — une dérogation
 * assumée doit rester lisible, pas se fondre dans du vert.
 */
export function ValidationLigne({ ficheId, r, onChange }: ValidationLigneProps) {
    const [pending, startTransition] = useTransition()
    const [ouvert, setOuvert] = useState(false)
    const [motif, setMotif] = useState("")
    const [erreur, setErreur] = useState<string | null>(null)

    const derogation = r.statut === "FAIL"
    const validation = r.validation
    const close = validation && !validation.perimee

    const agir = (action: () => Promise<{ ok: boolean; error?: string }>) =>
        startTransition(async () => {
            const res = await action()
            if (!res.ok) return setErreur(res.error ?? "Échec.")
            setErreur(null)
            setOuvert(false)
            setMotif("")
            onChange()
        })

    if (close) {
        return (
            <div
                onClick={(e) => e.stopPropagation()}
                className="mt-2 flex flex-wrap items-center gap-2 text-[11px]"
            >
                <span
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 font-semibold",
                        validation.decision === "DEROGATION"
                            ? "border-amber-300 bg-amber-50 text-amber-800"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    )}
                >
                    {validation.decision === "DEROGATION" ? (
                        <ShieldAlert className="h-3.5 w-3.5" />
                    ) : (
                        <Check className="h-3.5 w-3.5" />
                    )}
                    {validation.decision === "DEROGATION" ? "Dérogation assumée" : "Vérifié"} par{" "}
                    {validation.parNom} le {dateCourte(validation.le)}
                </span>
                {validation.justification && (
                    <span className="text-stone-500 italic">« {validation.justification} »</span>
                )}
                <button
                    onClick={() => agir(() => retirerValidationAction({ ficheId, pointId: r.id }))}
                    disabled={pending}
                    className="inline-flex items-center gap-1 text-stone-400 hover:text-stone-700 transition-colors"
                >
                    <Undo2 className="h-3 w-3" /> rouvrir
                </button>
            </div>
        )
    }

    return (
        // La ligne entière sert à montrer la zone sur le BAT : les gestes de
        // décision ne doivent pas la déclencher au passage.
        <div onClick={(e) => e.stopPropagation()} className="mt-2 space-y-2">
            {/* Ce que le BAT porte et que la fiche ignore : un clic, pas une
                recopie automatique — la fiche doit rester la référence. */}
            {r.proposition && (
                <button
                    onClick={() => agir(() => appliquerPropositionAction({ ficheId, pointId: r.id }))}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 px-2.5 py-1 text-[11px] font-semibold text-sky-700 transition-colors hover:bg-sky-50"
                >
                    {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Enregistrer « {r.proposition.valeur} » sur la fiche
                </button>
            )}

            {validation?.perimee && (
                <p className="text-[11px] text-amber-700">
                    Vous aviez validé ce point le {dateCourte(validation.le)} — le constat a changé
                    depuis, il est à revoir.
                </p>
            )}

            {ouvert ? (
                <div className="space-y-2">
                    <textarea
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                        rows={2}
                        autoFocus
                        placeholder={
                            derogation
                                ? "Motif de la dérogation (obligatoire)…"
                                : "Commentaire (facultatif)…"
                        }
                        className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-emerald-400"
                    />
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            disabled={pending || (derogation && motif.trim() === "")}
                            onClick={() =>
                                agir(() =>
                                    validerPointAction({
                                        ficheId,
                                        pointId: r.id,
                                        decision: derogation ? "DEROGATION" : "VERIFIE",
                                        justification: motif,
                                    })
                                )
                            }
                        >
                            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            {derogation ? "Assumer la dérogation" : "Confirmer"}
                        </Button>
                        <button
                            onClick={() => setOuvert(false)}
                            className="text-[11px] text-stone-400 hover:text-stone-600"
                        >
                            annuler
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setOuvert(true)}
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                        derogation
                            ? "border-amber-300 text-amber-800 hover:bg-amber-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    )}
                >
                    {derogation ? <ShieldAlert className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                    {derogation ? "Assumer par dérogation" : "Marquer vérifié"}
                </button>
            )}

            {erreur && <p className="text-[11px] text-red-600">{erreur}</p>}
        </div>
    )
}
