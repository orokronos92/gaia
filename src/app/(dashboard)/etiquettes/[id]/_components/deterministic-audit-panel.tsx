"use client"

import { useTransition } from "react"
import { Cpu, Loader2, ShieldCheck, AlertTriangle, XCircle, ShieldAlert, MinusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { auditDeterministeAction, type AuditDeterministeResult } from "@/app/actions/audit"
import { CONTROL_CHECKLIST } from "@/lib/audit/control-checklist"
import { verdictChecklist, type VerdictChecklist } from "@/lib/audit/synthesis"
import { AuditResultList } from "./audit-result-list"
import { fusionner } from "@/lib/audit/fusion-bat"
import { compterResteAFaire } from "@/lib/audit/checklist-complete"
import type { BatTextCheck } from "@/lib/audit/visual/text-robot"
import type { SousResultatAudit } from "./audit-synthese"

/**
 * Où en est la fiche, lu sur ce qu'il RESTE À FAIRE.
 *
 * L'ancien bandeau lisait le pire statut : une fois toutes les lignes traitées,
 * il continuait d'annoncer « non conforme » à côté de « 0 anomalie », parce que
 * la mesure, elle, n'avait pas changé — et elle ne doit pas changer, une
 * validation ne réécrit pas un constat.
 *
 * « Conforme sous dérogation » est un état à part entière, pas une politesse :
 * une non-conformité assumée reste une non-conformité assumée, et la fondre
 * dans du vert effacerait la décision qu'on vient précisément d'enregistrer.
 */
const VERDICT: Record<VerdictChecklist, { title: string; box: string; tone: string; icon: typeof ShieldCheck }> = {
    NON_CONFORME: { title: "Non conforme", box: "bg-red-50/60 border-red-200", tone: "text-red-700", icon: XCircle },
    TRAVAIL_RESTANT: { title: "Travail restant", box: "bg-orange-50/60 border-orange-200", tone: "text-orange-700", icon: AlertTriangle },
    CONFORME_SOUS_DEROGATION: { title: "Conforme sous dérogation", box: "bg-emerald-50/60 border-amber-300", tone: "text-emerald-700", icon: ShieldAlert },
    CONFORME: { title: "Conforme", box: "bg-emerald-50/60 border-emerald-200", tone: "text-emerald-700", icon: ShieldCheck },
    SANS_OBJET: { title: "Aucun contrôle applicable", box: "bg-stone-50 border-stone-200", tone: "text-stone-500", icon: MinusCircle },
}

interface DeterministicAuditPanelProps {
    ficheId: string
    /** Boutons rendus à côté du sien — l'analyse IA vit dans le même en-tête. */
    actions?: React.ReactNode
    /** Montre sur le BAT ce dont un point parle. */
    onVoir?: (r: import("@/lib/audit/types").ControlResult) => void
    pointVu?: string
    /** Résultats de l'audit BAT, s'il a été lancé — ils remplissent la liste. */
    batChecks?: BatTextCheck[]
    /** Controlled result, lifted to the fiche so it survives tab switches. */
    data: AuditDeterministeResult | null
    onData: (r: AuditDeterministeResult | null) => void
    onResult?: (r: SousResultatAudit) => void
}

export function DeterministicAuditPanel({ ficheId, actions, batChecks, data, onData, onResult, onVoir, pointVu }: DeterministicAuditPanelProps) {
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
    // Le verdict se recalcule sur la liste affichée : les preuves du BAT et les
    // décisions de la Qualité peuvent l'avoir déplacée depuis le calcul serveur.
    const synthese = resultats ? verdictChecklist(resultats) : data?.synthese
    const overall = data?.ok && synthese ? VERDICT[synthese.verdict] : null
    const reste = resultats ? compterResteAFaire(resultats) : data?.resteAFaire

    return (
        <Card className="border border-emerald-200/60 bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden rounded-3xl">
            {/* Le geste principal en premier et au-dessus : c'est celui qu'on
                fait à chaque fiche. L'analyse IA vient en second, et le compte
                des points se lit dans le registre plutôt que dans une phrase
                qui se périme au prochain contrôle ajouté. */}
            <CardHeader className="flex flex-col gap-4 border-b border-emerald-100 bg-emerald-50/40 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-lg font-bold text-emerald-950">
                        <Badge variant="outline" className="flex h-8 w-8 items-center justify-center rounded-lg border-none bg-emerald-100 p-1">
                            <Cpu className="h-5 w-5 text-emerald-700" />
                        </Badge>
                        Contrôle de la fiche
                    </CardTitle>
                    <CardDescription className="ml-10 max-w-prose leading-relaxed">
                        Les {CONTROL_CHECKLIST.length} points de PRO-QHS-013 et MOP-PRO-029.{" "}
                        <strong>Contrôler l&apos;étiquette</strong> mesure tout ce qui se mesure, sur
                        la fiche comme sur le BAT. <strong>Analyse IA</strong> ajoute la
                        reconnaissance des logos et le jugement de l&apos;allégation.
                    </CardDescription>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-60">
                    <Button
                        onClick={run}
                        disabled={pending}
                        className="h-11 w-full rounded-xl bg-emerald-600 font-bold text-white shadow-sm shadow-emerald-700/20 hover:bg-emerald-700"
                    >
                        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cpu className="mr-2 h-4 w-4" />}
                        {data?.ok ? "Recontrôler l'étiquette" : "Contrôler l'étiquette"}
                    </Button>
                    {actions}
                </div>
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
                                <h3 className={cn("font-black text-xl uppercase tracking-tight", overall.tone)}>
                                    {overall.title}
                                    {synthese && synthese.derogations > 0 && synthese.verdict === "CONFORME_SOUS_DEROGATION" && (
                                        <span className="ml-2 text-sm font-bold normal-case text-amber-700">
                                            ({synthese.derogations})
                                        </span>
                                    )}
                                </h3>
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
                        {resultats && <AuditResultList results={resultats} ficheId={ficheId} onChange={run} onVoir={onVoir} pointVu={pointVu} />}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
