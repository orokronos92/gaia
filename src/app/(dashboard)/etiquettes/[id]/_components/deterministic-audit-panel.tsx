"use client"

import { useTransition } from "react"
import { Cpu, Loader2, ShieldCheck, AlertTriangle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { auditDeterministeAction, type AuditDeterministeResult } from "@/app/actions/audit"
import type { ControlStatus } from "@/lib/audit/types"
import { AuditResultList } from "./audit-result-list"
import { fusionner } from "@/lib/audit/fusion-bat"
import { compterResteAFaire } from "@/lib/audit/checklist-complete"
import type { BatTextCheck } from "@/lib/audit/visual/text-robot"
import type { SousResultatAudit } from "./audit-synthese"

const OVERALL: Record<ControlStatus, { title: string; box: string; tone: string; icon: typeof ShieldCheck }> = {
    PASS: { title: "Rien à signaler", box: "bg-emerald-50/60 border-emerald-200", tone: "text-emerald-700", icon: ShieldCheck },
    WARNING: { title: "Travail restant", box: "bg-orange-50/60 border-orange-200", tone: "text-orange-700", icon: AlertTriangle },
    FAIL: { title: "Non conforme", box: "bg-red-50/60 border-red-200", tone: "text-red-700", icon: XCircle },
    NA: { title: "Non applicable", box: "bg-stone-50 border-stone-200", tone: "text-stone-500", icon: ShieldCheck },
}

interface DeterministicAuditPanelProps {
    ficheId: string
    /** Résultats de l'audit BAT, s'il a été lancé — ils remplissent la liste. */
    batChecks?: BatTextCheck[]
    /** Controlled result, lifted to the fiche so it survives tab switches. */
    data: AuditDeterministeResult | null
    onData: (r: AuditDeterministeResult | null) => void
    onResult?: (r: SousResultatAudit) => void
}

export function DeterministicAuditPanel({ ficheId, batChecks, data, onData, onResult }: DeterministicAuditPanelProps) {
    const [pending, startTransition] = useTransition()

    const run = () => {
        startTransition(async () => {
            const res = await auditDeterministeAction({ ficheId })
            onData(res)
            if (res.ok) onResult?.({ overallStatus: res.overallStatus, counts: res.counts })
        })
    }

    // L'audit BAT ne tient plus une liste à part : ses verdicts viennent remplir
    // les points de la checklist auxquels ils répondent.
    const resultats = data?.results
        ? batChecks && batChecks.length > 0
            ? fusionner(data.results, batChecks)
            : data.results
        : undefined
    const overall = data?.ok && data.overallStatus ? OVERALL[data.overallStatus] : null
    const reste = resultats ? compterResteAFaire(resultats) : data?.resteAFaire

    return (
        <Card className="border border-emerald-200/60 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="pb-4 flex flex-row items-center justify-between bg-emerald-50/40 border-b border-emerald-100">
                <div>
                    <CardTitle className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                        <Badge variant="outline" className="p-1 h-8 w-8 rounded-lg bg-emerald-100 border-none flex items-center justify-center">
                            <Cpu className="h-5 w-5 text-emerald-700" />
                        </Badge>
                        Contrôle de la fiche
                    </CardTitle>
                    <CardDescription className="ml-10">
                        Les 39 points de PRO-QHS-013 et MOP-PRO-029 — ce qui est vérifié par calcul,
                        et ce qui vous reste à faire.
                    </CardDescription>
                </div>
                <Button
                    onClick={run}
                    disabled={pending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-700/20 rounded-xl font-bold px-6"
                >
                    {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cpu className="mr-2 h-4 w-4" />}
                    Lancer
                </Button>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
                {!data && !pending && (
                    <div className="flex flex-col items-center justify-center text-center h-40 opacity-70">
                        <Cpu className="h-14 w-14 text-stone-300 mb-3 stroke-[1.5]" />
                        <p className="text-stone-600 font-medium">Contrôle non lancé.</p>
                        <p className="text-stone-400 text-sm mt-1">Affiche tout ce qui reste à contrôler sur cette fiche.</p>
                    </div>
                )}

                {data && !data.ok && (
                    <div className="p-4 rounded-2xl border border-red-200 bg-red-50/60 text-red-700 text-sm font-medium">
                        {data.error}
                    </div>
                )}

                {data?.ok && overall && (
                    <div className="space-y-6 max-w-3xl">
                        <div className={cn("p-5 rounded-2xl border-2 flex items-center gap-4", overall.box)}>
                            <overall.icon className={cn("h-9 w-9 shrink-0", overall.tone)} />
                            <div>
                                <h3 className={cn("font-black text-xl uppercase tracking-tight", overall.tone)}>{overall.title}</h3>
                                {reste && (
                                    <p className="text-sm text-stone-600 mt-1 font-medium">
                                        {reste.corriger > 0 && (
                                            <span className="text-red-700">{reste.corriger} à corriger · </span>
                                        )}
                                        {reste.completer > 0 && (
                                            <span className="text-sky-700">{reste.completer} à compléter · </span>
                                        )}
                                        {reste.verifier} à vérifier · {reste.fait} vérifié(s)
                                        {reste.nonApplicable > 0 && ` · ${reste.nonApplicable} sans objet`}
                                    </p>
                                )}
                            </div>
                        </div>
                        {resultats && <AuditResultList results={resultats} ficheId={ficheId} onChange={run} />}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
