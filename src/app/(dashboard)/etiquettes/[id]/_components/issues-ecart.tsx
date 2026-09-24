"use client"

import { useState } from "react"
import { Clock, Loader2, Pencil, Printer, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { corrigerDepuisControleAction } from "@/app/actions/correction-controle"
import { validerPointAction } from "@/app/actions/validation-controle"
import type { Decision } from "@/lib/audit/decisions"
import type { ControlResult } from "@/lib/audit/types"

type Issue = "corriger" | "bat" | "arbitrer" | "attente"

interface IssueDef {
    libelle: string
    icon: typeof Pencil
    ton: string
    placeholder: string
    obligatoire: boolean
    confirmer: string
    decision?: Decision
}

const ISSUES: Record<Issue, IssueDef> = {
    corriger: {
        libelle: "Corriger la fiche",
        icon: Pencil,
        ton: "border-sky-200 text-sky-700 hover:bg-sky-50",
        placeholder: "",
        obligatoire: true,
        confirmer: "Enregistrer sur la fiche",
    },
    bat: {
        libelle: "BAT à refaire",
        icon: Printer,
        ton: "border-violet-200 text-violet-700 hover:bg-violet-50",
        placeholder: "Ce que le Graphisme doit corriger (facultatif)…",
        obligatoire: false,
        confirmer: "Signaler au Graphisme",
        decision: "BAT_A_REFAIRE",
    },
    arbitrer: {
        libelle: "Arbitrer l'écart",
        icon: ShieldAlert,
        ton: "border-amber-300 text-amber-800 hover:bg-amber-50",
        placeholder: "Pourquoi l'écart est accepté (obligatoire)…",
        obligatoire: true,
        confirmer: "Accepter l'écart",
        decision: "DEROGATION",
    },
    attente: {
        libelle: "En attente d'info",
        icon: Clock,
        ton: "border-stone-300 text-stone-600 hover:bg-stone-50",
        placeholder: "Quelle information, et de qui (obligatoire)…",
        obligatoire: true,
        confirmer: "Mettre en attente",
        decision: "EN_ATTENTE",
    },
}

interface IssuesEcartProps {
    ficheId: string
    r: Pick<ControlResult, "id"> & Partial<Pick<ControlResult, "correction" | "mode" | "preuves">>
    pending: boolean
    agir: (action: () => Promise<{ ok: boolean; error?: string }>) => void
}

/**
 * Les issues d'un écart, sur la carte même (lot 3, 2026-09-24).
 *
 * Face à une divergence prouvée, Marie a quatre gestes : corriger la fiche si
 * c'est elle qui se trompe, renvoyer le BAT au Graphisme si c'est lui, accepter
 * l'écart par écrit, ou le laisser ouvert le temps d'avoir la réponse. Les deux
 * derniers gardent la ligne dans sa liste de travail, avec un badge qui dit qui
 * la tient.
 *
 * « Corriger la fiche » n'est offert que là où le contrôle nomme le champ en
 * cause (liste Excel du 2.5, poids net du 16.2, Gencode du 16.3 et du 16.4) ;
 * le serveur relit ce champ lui-même, il ne le reçoit pas du navigateur.
 */
export function IssuesEcart({ ficheId, r, pending, agir }: IssuesEcartProps) {
    const [issue, setIssue] = useState<Issue | null>(null)
    const [texte, setTexte] = useState("")
    const corrigeable = r.correction !== undefined
    // A point computed on the fiche alone (16.2: weight against the article
    // code) has no artwork to redo — unless the BAT was read for it too.
    const surLeBat = r.mode !== "deterministic" || (r.preuves?.length ?? 0) > 0
    const offertes = (Object.keys(ISSUES) as Issue[]).filter(
        (i) => (i !== "corriger" || corrigeable) && (i !== "bat" || surLeBat)
    )

    const ouvrir = (i: Issue) => {
        setIssue(i)
        setTexte(i === "corriger" ? (r.correction?.valeur ?? "") : "")
    }

    const confirmer = () => {
        if (issue === null) return
        const def = ISSUES[issue]
        if (issue === "corriger") {
            agir(() => corrigerDepuisControleAction({ ficheId, pointId: r.id, valeur: texte }))
        } else if (def.decision) {
            const decision = def.decision
            agir(() => validerPointAction({ ficheId, pointId: r.id, decision, justification: texte }))
        }
        setIssue(null)
    }

    if (issue !== null) {
        const def = ISSUES[issue]
        return (
            <div className="space-y-2">
                {issue === "corriger" && r.correction && (
                    <p className="text-[11px] text-stone-500">
                        {r.correction.libelle} — la modification est tracée (avant / après).
                    </p>
                )}
                <textarea
                    value={texte}
                    onChange={(e) => setTexte(e.target.value)}
                    rows={issue !== "corriger" ? 2 : (r.correction?.valeur?.length ?? 0) > 80 ? 4 : 1}
                    autoFocus
                    placeholder={def.placeholder}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-emerald-400"
                />
                <div className="flex items-center gap-2">
                    <Button size="sm" disabled={pending || (def.obligatoire && texte.trim() === "")} onClick={confirmer}>
                        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {def.confirmer}
                    </Button>
                    <button onClick={() => setIssue(null)} className="text-[11px] text-stone-400 hover:text-stone-600">
                        annuler
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {offertes.map((i) => {
                const def = ISSUES[i]
                return (
                    <button
                        key={i}
                        onClick={() => ouvrir(i)}
                        disabled={pending}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                            def.ton
                        )}
                    >
                        <def.icon className="h-3.5 w-3.5" />
                        {def.libelle}
                    </button>
                )
            })}
        </div>
    )
}
