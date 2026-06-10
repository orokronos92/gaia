"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, ScanText, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { auditVisuelTexteAction, type AuditVisuelTexteResult } from "@/app/actions/audit-visuel"
import type { ControlStatus } from "@/lib/audit/types"
import type { SousResultatAudit } from "./audit-synthese"

const STATUS_STYLE: Record<ControlStatus, { label: string; chip: string; icon: typeof CheckCircle2; tone: string }> = {
    PASS: { label: "Conforme", chip: "border-emerald-200 text-emerald-700 bg-emerald-50", icon: CheckCircle2, tone: "text-emerald-600" },
    WARNING: { label: "À vérifier", chip: "border-orange-200 text-orange-700 bg-orange-50", icon: AlertTriangle, tone: "text-orange-500" },
    FAIL: { label: "Non conforme", chip: "border-red-200 text-red-700 bg-red-50", icon: XCircle, tone: "text-red-500" },
    NA: { label: "Non applicable", chip: "border-stone-200 text-stone-400 bg-stone-50", icon: MinusCircle, tone: "text-stone-300" },
}

interface BatTextAuditPanelProps {
    ficheId: string
    onResult?: (r: SousResultatAudit) => void
}

export function BatTextAuditPanel({ ficheId, onResult }: BatTextAuditPanelProps) {
    const [isPending, startTransition] = useTransition()
    const [result, setResult] = useState<AuditVisuelTexteResult | null>(null)

    const run = () =>
        startTransition(async () => {
            const res = await auditVisuelTexteAction({ ficheId })
            setResult(res)
            if (res.ok) onResult?.({ overallStatus: res.overallStatus, counts: res.counts })
        })

    const checks = result?.checks ?? []
    const rubriques = [...new Set(checks.map((c) => c.rubrique))]
    const overall = result?.overallStatus ? STATUS_STYLE[result.overallStatus] : null

    return (
        <div className="bg-white border border-stone-200/70 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <ScanText className="h-5 w-5 text-stone-500" />
                    <div>
                        <h3 className="text-sm font-bold text-stone-800">Audit texte des étiquettes</h3>
                        <p className="text-xs text-stone-400">Compare le texte imprimé sur les BAT aux données de la fiche.</p>
                    </div>
                </div>
                <Button onClick={run} disabled={isPending} size="sm">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
                    {isPending ? "Analyse…" : "Analyser"}
                </Button>
            </div>

            {result && !result.ok && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{result.error}</p>
            )}

            {result?.ok && (
                <>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {overall && (
                            <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 font-bold uppercase", overall.chip)}>
                                {overall.label}
                            </Badge>
                        )}
                        <span className="text-stone-500">
                            {result.counts?.PASS ?? 0} conforme(s) · {result.counts?.WARNING ?? 0} à vérifier · {result.counts?.FAIL ?? 0} non conforme(s)
                        </span>
                        {result.faces && result.faces.length > 0 && (
                            <span className="text-stone-300 font-mono ml-auto truncate">{result.faces.join(" · ")}</span>
                        )}
                    </div>

                    <div className="space-y-5">
                        {rubriques.map((rubrique) => (
                            <section key={rubrique} className="space-y-2">
                                <h4 className="text-xs font-extrabold uppercase tracking-widest text-stone-400 pl-1">{rubrique}</h4>
                                {checks.filter((c) => c.rubrique === rubrique).map((c) => {
                                    const style = STATUS_STYLE[c.statut]
                                    const Icon = style.icon
                                    return (
                                        <div key={c.id} className="flex gap-3 p-3.5 bg-stone-50/60 border border-stone-200/70 rounded-xl">
                                            <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", style.tone)} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <span className="text-sm font-semibold text-stone-800 leading-snug">{c.libelle}</span>
                                                    <Badge variant="outline" className={cn("text-[10px] px-2 py-0 font-bold uppercase shrink-0", style.chip)}>
                                                        {style.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">{c.justification}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </section>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
