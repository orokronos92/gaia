"use client"

import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, Cpu, ScanText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ControlStatus } from "@/lib/audit/types"

/** What each lane (data / visual) reports up to the synthesis. */
export interface SousResultatAudit {
    overallStatus?: ControlStatus
    counts?: Record<ControlStatus, number>
}

const STYLE: Record<ControlStatus, { label: string; box: string; tone: string; icon: typeof CheckCircle2 }> = {
    PASS: { label: "Conforme", box: "bg-emerald-50/60 border-emerald-200", tone: "text-emerald-700", icon: CheckCircle2 },
    WARNING: { label: "Vérifications requises", box: "bg-orange-50/60 border-orange-200", tone: "text-orange-700", icon: AlertTriangle },
    FAIL: { label: "Non conforme", box: "bg-red-50/60 border-red-200", tone: "text-red-700", icon: XCircle },
    NA: { label: "Non applicable", box: "bg-stone-50 border-stone-200", tone: "text-stone-500", icon: MinusCircle },
}

const RANK: Record<ControlStatus, number> = { FAIL: 3, WARNING: 2, PASS: 1, NA: 0 }

/** Worst-wins across the lanes actually run; null when nothing has run yet. */
function pire(...statuses: (ControlStatus | undefined)[]): ControlStatus | null {
    const present = statuses.filter(Boolean) as ControlStatus[]
    if (present.length === 0) return null
    return present.reduce((a, b) => (RANK[b] > RANK[a] ? b : a))
}

function Ligne({ icon: Icon, libelle, res }: { icon: typeof Cpu; libelle: string; res: SousResultatAudit | null }) {
    const style = res?.overallStatus ? STYLE[res.overallStatus] : null
    return (
        <div className="flex items-center gap-3 py-2">
            <Icon className="h-4 w-4 text-stone-400 shrink-0" />
            <span className="text-sm font-semibold text-stone-700 w-32 shrink-0">{libelle}</span>
            {style && res?.counts ? (
                <>
                    <span className={cn("text-xs font-bold uppercase", style.tone)}>{style.label}</span>
                    <span className="text-xs text-stone-400 ml-auto">
                        {res.counts.PASS} ✓ · {res.counts.WARNING} ⚠ · {res.counts.FAIL} ✕
                    </span>
                </>
            ) : (
                <span className="text-xs text-stone-400 italic">non lancé</span>
            )}
        </div>
    )
}

interface AuditSyntheseProps {
    donnees: SousResultatAudit | null
    visuel: SousResultatAudit | null
}

export function AuditSynthese({ donnees, visuel }: AuditSyntheseProps) {
    const global = pire(donnees?.overallStatus, visuel?.overallStatus)
    if (!global) return null

    const style = STYLE[global]
    const Icon = style.icon

    return (
        <div className={cn("rounded-3xl border-2 p-5 shadow-sm", style.box)}>
            <div className="flex items-center gap-4">
                <Icon className={cn("h-10 w-10 shrink-0", style.tone)} />
                <div>
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Conformité globale</p>
                    <h3 className={cn("font-black text-2xl uppercase tracking-tight", style.tone)}>{style.label}</h3>
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-stone-200/60 divide-y divide-stone-100">
                <Ligne icon={Cpu} libelle="Données fiche" res={donnees} />
                <Ligne icon={ScanText} libelle="Étiquettes (BAT)" res={visuel} />
            </div>
            {!visuel && (
                <p className="text-xs text-stone-400 mt-3">L'audit visuel se lance dans l'onglet « BAT & Fichiers ».</p>
            )}
        </div>
    )
}
