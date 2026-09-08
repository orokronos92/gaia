"use client"

import { useState, useTransition } from "react"
import { FolderOpen, Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { auditVisuelTexteAction, type AuditVisuelTexteResult } from "@/app/actions/audit-visuel"
import type { AuditDeterministeResult } from "@/app/actions/audit"
import { BatVisionneuse, type FaceBatAffichable } from "./bat-visionneuse"
import { ConstatsHorsChecklist } from "./constats-hors-checklist"
import { DeterministicAuditPanel } from "./deterministic-audit-panel"
import type { SousResultatAudit } from "./audit-synthese"
import type { ControlResult } from "@/lib/audit/types"
import type { RepereBat } from "@/lib/audit/visual/reperes"

interface ControleEtiquetteProps {
    ficheId: string
    faces: FaceBatAffichable[]
    detData: AuditDeterministeResult | null
    onDetData: (r: AuditDeterministeResult | null) => void
    onDetResult?: (r: SousResultatAudit) => void
    visData: AuditVisuelTexteResult | null
    onVisData: (r: AuditVisuelTexteResult | null) => void
    onVisResult?: (r: SousResultatAudit) => void
}

/**
 * Le contrôle d'une étiquette, en un seul écran.
 *
 * Il y avait deux onglets : la checklist d'un côté, l'audit BAT de l'autre.
 * C'était justifié tant que la checklist ignorait tout des BAT — elle les lit
 * elle-même désormais, et les deux écrans disaient donc la même chose à deux
 * endroits.
 *
 * Reste ce que l'audit BAT apporte encore, et lui seul : le **seul appel de
 * modèle** (vision sur les logos, sémantique sur l'allégation), la provenance
 * de ce qui a été lu, et des constats qui ne se rattachent à aucun point du
 * registre. Ces trois choses vivent maintenant ici.
 *
 * Et l'étiquette est à côté de la liste. Marie passe son temps à la regarder ;
 * la lui faire ouvrir ailleurs lui faisait perdre sa place à chaque ligne.
 */
export function ControleEtiquette({
    ficheId,
    faces,
    detData,
    onDetData,
    onDetResult,
    visData,
    onVisData,
    onVisResult,
}: ControleEtiquetteProps) {
    const [pending, startTransition] = useTransition()
    const [faceActive, setFaceActive] = useState(0)
    const [montre, setMontre] = useState<{ point: string; reperes: RepereBat[] } | null>(null)

    // Montrer un point, c'est d'abord aller sur la bonne face : sinon Marie
    // cherche sur l'étiquette qu'elle a sous les yeux ce qui est sur l'autre.
    const voir = (r: ControlResult) => {
        const reperes = (r.reperes ?? []) as RepereBat[]
        if (reperes.length === 0) return
        setFaceActive(reperes[0].face)
        setMontre({ point: r.id, reperes })
    }

    const lancerIa = () =>
        startTransition(async () => {
            const res = await auditVisuelTexteAction({ ficheId })
            onVisData(res)
            if (res.ok) onVisResult?.({ overallStatus: res.overallStatus, counts: res.counts })
        })

    // Ce que l'IA a apporté et qui ne se rattache à aucun point : la divergence
    // « miel bio » / « miel » en est l'exemple type — exactement ce que la
    // Qualité doit arbitrer, et que la fusion ferait disparaître en silence.
    const horsChecklist = (visData?.checks ?? []).filter((c) => !c.checklistId)

    return (
        <div className="space-y-4">
            {visData?.ok && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-stone-200/70 bg-stone-50/70 px-4 py-2 text-[11px] text-stone-500">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-stone-600">
                        <FolderOpen className="h-3.5 w-3.5" />
                        {visData.dossiers?.join(", ") ?? "—"}
                    </span>
                    <span>{visData.faces?.length ?? 0} face(s) lue(s)</span>
                    <span className="truncate">{visData.faces?.join(" · ")}</span>
                </div>
            )}

            {visData && !visData.ok && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {visData.error}
                </p>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="space-y-4 xl:col-span-7">
                    <DeterministicAuditPanel
                        ficheId={ficheId}
                        batChecks={visData?.checks}
                        data={detData}
                        onData={onDetData}
                        onResult={onDetResult}
                        onVoir={voir}
                        pointVu={montre?.point}
                        actions={
                            <Button
                                variant="outline"
                                onClick={lancerIa}
                                disabled={pending}
                                className="rounded-xl border-stone-300 font-bold text-stone-700"
                                title="Reconnaissance des logos et jugement de l'allégation — consomme des jetons"
                            >
                                {pending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="mr-2 h-4 w-4" />
                                )}
                                {pending ? "Analyse…" : "Analyse IA"}
                            </Button>
                        }
                    />
                    <ConstatsHorsChecklist checks={horsChecklist} />
                </div>

                <div className="xl:col-span-5">
                    <div className="xl:sticky xl:top-6">
                        <BatVisionneuse
                            faces={faces}
                            faceActive={faceActive}
                            onFaceChange={(i) => {
                                setFaceActive(i)
                                setMontre(null)
                            }}
                            reperes={montre?.reperes}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
