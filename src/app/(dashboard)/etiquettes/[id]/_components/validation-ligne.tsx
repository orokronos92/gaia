"use client"

import { useState, useTransition } from "react"
import { Check, Clock, Download, Loader2, Printer, ShieldAlert, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { appliquerPropositionAction } from "@/app/actions/proposition-fiche"
import {
    retirerValidationAction,
    validerPointAction,
} from "@/app/actions/validation-controle"
import { estDecisionOuverte, estTranche } from "@/lib/audit/decisions"
import type { ControlResult } from "@/lib/audit/types"
import { IssuesEcart } from "./issues-ecart"

/**
 * Ce que la ligne a besoin de savoir. Un point du registre et un constat relevé
 * hors registre n'ont pas la même forme, mais le geste est le même — et il doit
 * l'être : une anomalie qu'on ne peut pas clore reste éternellement ouverte.
 */
type ConstatDecidable = Pick<ControlResult, "id" | "statut"> &
    Partial<Pick<ControlResult, "validation" | "proposition" | "comparaisonListe">>

const dateCourte = (d: Date | string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })

interface ValidationLigneProps {
    ficheId: string
    r: ConstatDecidable
    /** Relance la checklist : une décision change ce que l'écran doit montrer. */
    onChange: () => void
}

/**
 * Le geste que la Qualité n'avait pas : clore un point, ou l'assumer.
 *
 * Deux régimes, volontairement. Cocher une alerte, c'est dire « j'ai regardé,
 * c'est bon ». Un écart prouvé, lui, a ses issues (issues-ecart.tsx) : corriger
 * la fiche, renvoyer le BAT, l'arbitrer par écrit — l'arbitrage reste marqué,
 * pas fondu dans du vert —, ou le laisser en attente d'une information.
 */
export function ValidationLigne({ ficheId, r, onChange }: ValidationLigneProps) {
    const [pending, startTransition] = useTransition()
    const [ouvert, setOuvert] = useState(false)
    const [motif, setMotif] = useState("")
    const [erreur, setErreur] = useState<string | null>(null)

    const ecart = r.statut === "FAIL"
    // Les autres points que cette même valeur rouvre — le point courant exclu.
    const autresPoints = (r.proposition?.sert ?? []).filter((p) => p !== r.id)
    const validation = r.validation
    const close = estTranche(validation)
    // BAT à refaire, en attente d'info : la ligne reste ouverte, elle dit qui la tient.
    const aiguillee = validation && !validation.perimee && estDecisionOuverte(validation.decision) ? validation : null

    const agir = (action: () => Promise<{ ok: boolean; error?: string }>) =>
        startTransition(async () => {
            const res = await action()
            if (!res.ok) return setErreur(res.error ?? "Échec.")
            setErreur(null)
            setOuvert(false)
            setMotif("")
            onChange()
        })

    if (close && validation) {
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
                    {validation.decision === "DEROGATION" ? "Écart arbitré (dérogation)" : "Vérifié"} par{" "}
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
                    {/* Une donnée absente bloque souvent plusieurs points. Le
                        dire évite de traiter trois fois ce qu'un clic règle. */}
                    {autresPoints.length > 0 && (
                        <span className="font-medium text-sky-600/80">
                            — rouvre aussi {autresPoints.join(" et ")}
                        </span>
                    )}
                </button>
            )}

            {aiguillee && (
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 font-semibold",
                            aiguillee.decision === "BAT_A_REFAIRE"
                                ? "border-violet-200 bg-violet-50 text-violet-700"
                                : "border-stone-300 bg-stone-50 text-stone-700"
                        )}
                    >
                        {aiguillee.decision === "BAT_A_REFAIRE" ? <Printer className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                        {aiguillee.decision === "BAT_A_REFAIRE" ? "BAT à refaire" : "En attente d'info"} — {aiguillee.parNom} le{" "}
                        {dateCourte(aiguillee.le)}
                    </span>
                    {aiguillee.justification && <span className="text-stone-500 italic">« {aiguillee.justification} »</span>}
                    <button
                        onClick={() => agir(() => retirerValidationAction({ ficheId, pointId: r.id }))}
                        disabled={pending}
                        className="inline-flex items-center gap-1 text-stone-400 hover:text-stone-700 transition-colors"
                    >
                        <Undo2 className="h-3 w-3" /> retirer
                    </button>
                </div>
            )}

            {/* Une décision périmée se signale — sauf une mise en attente ou un
                renvoi au Graphisme dont l'écart a disparu : c'est réglé, le dire
                encore serait du bruit. */}
            {validation?.perimee && (!estDecisionOuverte(validation.decision) || ecart) && (
                <p className="text-[11px] text-amber-700">
                    {estDecisionOuverte(validation.decision)
                        ? `Signalé le ${dateCourte(validation.le)} (${validation.decision === "BAT_A_REFAIRE" ? "BAT à refaire" : "en attente d'info"}) — l'écart a changé depuis, il est à revoir.`
                        : `Vous aviez validé ce point le ${dateCourte(validation.le)} — le constat a changé depuis, il est à revoir.`}
                </p>
            )}

            {/* Un écart prouvé a ses propres issues ; une alerte se coche. */}
            {ecart ? (
                <IssuesEcart ficheId={ficheId} r={r} pending={pending} agir={agir} />
            ) : ouvert ? (
                <div className="space-y-2">
                    <textarea
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                        rows={2}
                        autoFocus
                        placeholder="Commentaire (facultatif)…"
                        className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-emerald-400"
                    />
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                                agir(() => validerPointAction({ ficheId, pointId: r.id, decision: "VERIFIE", justification: motif }))
                            }
                        >
                            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            Confirmer
                        </Button>
                        <button onClick={() => setOuvert(false)} className="text-[11px] text-stone-400 hover:text-stone-600">
                            annuler
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setOuvert(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                >
                    <Check className="h-3.5 w-3.5" />
                    Marquer vérifié
                </button>
            )}

            {erreur && <p className="text-[11px] text-red-600">{erreur}</p>}
        </div>
    )
}
