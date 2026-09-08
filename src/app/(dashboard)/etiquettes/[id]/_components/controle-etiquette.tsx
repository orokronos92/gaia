"use client"

import { useState, useTransition } from "react"
import { FolderOpen, Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { auditVisuelTexteAction, type AuditVisuelTexteResult } from "@/app/actions/audit-visuel"
import { auditDeterministeAction } from "@/app/actions/audit"
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
    const [montre, setMontre] = useState<{ point: string; reperes: RepereBat[]; demande: number } | null>(null)

    // Montrer un point, c'est d'abord aller sur la bonne face : sinon Marie
    // cherche sur l'étiquette qu'elle a sous les yeux ce qui est sur l'autre.
    const voir = (r: ControlResult) => {
        const reperes = (r.reperes ?? []) as RepereBat[]
        if (reperes.length === 0) return
        setFaceActive(reperes[0].face)
        // Le compteur monte même quand on reclique la même ligne : c'est ce qui
        // permet de revenir sur la zone après avoir dézoomé pour voir autour.
        setMontre((m) => ({ point: r.id, reperes, demande: (m?.demande ?? 0) + 1 }))
    }

    // L'analyse IA n'a de sens que posée sur une liste : sans contrôle préalable,
    // ses constats n'avaient aucune ligne où se ranger et l'écran restait vide.
    // On ne fait plus dépendre le résultat de l'ordre des clics.
    const lancerIa = () =>
        startTransition(async () => {
            if (!detData?.ok) {
                const socle = await auditDeterministeAction({ ficheId })
                onDetData(socle)
                if (socle.ok) onDetResult?.({ overallStatus: socle.overallStatus, counts: socle.counts })
            }
            const res = await auditVisuelTexteAction({ ficheId })
            onVisData(res)
            if (res.ok) onVisResult?.({ overallStatus: res.overallStatus, counts: res.counts })
        })

    // Toutes les zones des points encore ouverts : elles se dessinent d'emblée,
    // en trait pâle. Marie voit ce qui reste à regarder sans avoir à cliquer
    // ligne par ligne pour le découvrir. Les points clos n'y figurent pas — les
    // afficher tous rendrait l'image illisible et viderait le mot « anomalie ».
    const zonesOuvertes: RepereBat[] = (detData?.results ?? [])
        .filter((r) => r.statut !== "NA" && (r.action ?? "VERIFIER") !== "RIEN")
        .flatMap((r) => (r.reperes ?? []) as RepereBat[])

    // Ce que l'IA a apporté et qui ne se rattache à aucun point : la divergence
    // « miel bio » / « miel » en est l'exemple type — exactement ce que la
    // Qualité doit arbitrer, et que la fusion ferait disparaître en silence.
    // Le contrôle gratuit en produit déjà — la divergence « miel bio » / « miel »
    // n'attend pas l'IA pour apparaître. On dédoublonne par identifiant au cas
    // où les deux sources remonteraient le même constat.
    const horsChecklist = [
        ...new Map(
            [...(detData?.horsChecklist ?? []), ...(visData?.checks ?? []).filter((c) => !c.checklistId)].map(
                (c) => [c.id, c]
            )
        ).values(),
    ]

    const lues = visData?.faces ?? detData?.faces ?? []
    const dossiers = visData?.dossiers ?? detData?.dossiers ?? []

    return (
        <div className="space-y-4">
            {lues.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-stone-200/70 bg-stone-50/70 px-4 py-2 text-[11px] text-stone-500">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-stone-600">
                        <FolderOpen className="h-3.5 w-3.5" />
                        {dossiers.join(", ") || "—"}
                    </span>
                    <span>{lues.length} face(s) lue(s)</span>
                    <span className="truncate">{lues.join(" · ")}</span>
                </div>
            )}

            {visData && !visData.ok && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {visData.error}
                </p>
            )}

            {/*
              Le volet reste visible quelle que soit la largeur, mais pas de la
              même façon : à côté de la liste sur grand écran, au-dessus d'elle
              sur un portable. Dans les deux cas il est collant — Marie regarde
              l'étiquette à presque chaque ligne, la lui faire remonter chercher
              lui ferait perdre sa place.
            */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="order-2 space-y-4 xl:order-1 xl:col-span-7">
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
                                title="Reconnaissance des logos et jugement de l'allégation — consomme des jetons. Lance le contrôle s'il ne l'a pas été."
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

                <div className="order-1 xl:order-2 xl:col-span-5">
                    <div className="sticky top-4 z-10 xl:top-6">
                        <BatVisionneuse
                            faces={faces}
                            faceActive={faceActive}
                            reperesFaibles={zonesOuvertes}
                            onFaceChange={(i) => {
                                setFaceActive(i)
                                setMontre(null)
                            }}
                            reperes={montre?.reperes}
                            demandeCadrage={montre?.demande}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
