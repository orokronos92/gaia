"use client"

import { Cpu, ScanText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ControlStatus } from "@/lib/audit/types"

/** What each lane (data / visual) reports up to the synthesis. */
export interface SousResultatAudit {
    overallStatus?: ControlStatus
    counts?: Record<ControlStatus, number>
}

/**
 * Ce bandeau ne rend plus de verdict.
 *
 * Il en rendait un — « conformité globale », le pire statut brut des deux
 * voies — et il contredisait celui de la checklist juste en dessous : une fois
 * la dérogation assumée et les alertes levées, la Qualité lisait « non
 * conforme » à dix pixels au-dessus de « conforme sous dérogation ». Les deux
 * calculs étaient justes, mais répondaient à deux questions différentes ; en
 * tête d'écran, seule compte celle du travail restant, et c'est la checklist
 * qui y répond.
 *
 * Ce qui reste ici est la seule chose qu'aucun autre endroit ne porte depuis la
 * fusion des voies : **quelle voie a tourné**, et ce qu'elle a compté.
 */
const STYLE: Record<ControlStatus, { label: string; tone: string }> = {
    PASS: { label: "Conforme", tone: "text-emerald-700" },
    WARNING: { label: "Vérifications requises", tone: "text-orange-700" },
    FAIL: { label: "Non conforme", tone: "text-red-700" },
    NA: { label: "Non applicable", tone: "text-stone-500" },
}

/**
 * Ce que chaque chiffre compte, écrit en toutes lettres.
 *
 * « 14 ✓ · 17 ⚠ · 1 ✕ » demandait de connaître la convention pour être lu, et
 * personne ne la connaît de tête. Un compte de contrôles se dit avec le mot du
 * métier ; les sans-objet comptent aussi, sinon la somme ne tombe jamais sur le
 * nombre de points de la checklist et le lecteur se demande ce qui manque.
 */
const COMPTES: { cle: ControlStatus; mot: (n: number) => string; tone: string }[] = [
    { cle: "PASS", mot: (n) => (n > 1 ? "conformes" : "conforme"), tone: "text-emerald-700" },
    { cle: "WARNING", mot: () => "à vérifier", tone: "text-orange-700" },
    { cle: "FAIL", mot: (n) => (n > 1 ? "non conformes" : "non conforme"), tone: "text-red-700" },
    { cle: "NA", mot: () => "sans objet", tone: "text-stone-400" },
]

function Ligne({ icon: Icon, libelle, res }: { icon: typeof Cpu; libelle: string; res: SousResultatAudit | null }) {
    const style = res?.overallStatus ? STYLE[res.overallStatus] : null
    const counts = res?.counts
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
            <Icon className="h-4 w-4 text-stone-400 shrink-0" />
            <span className="text-sm font-semibold text-stone-700 w-32 shrink-0">{libelle}</span>
            {style && counts ? (
                <>
                    <span className={cn("text-xs font-bold uppercase", style.tone)}>{style.label}</span>
                    <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                        {COMPTES.filter((c) => counts[c.cle] > 0).map((c) => (
                            <span key={c.cle} className={c.tone}>
                                <span className="font-bold">{counts[c.cle]}</span> {c.mot(counts[c.cle])}
                            </span>
                        ))}
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
    // Tant qu'aucune voie n'a tourné, la checklist dit déjà « contrôle non
    // lancé » : un second encart vide ne ferait que répéter.
    if (!donnees?.overallStatus && !visuel?.overallStatus) return null

    return (
        <div className="rounded-2xl border border-stone-200 bg-white/60 px-5 py-3 shadow-sm">
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Voies de contrôle</p>
            <div className="mt-1 divide-y divide-stone-100">
                <Ligne icon={Cpu} libelle="Données fiche" res={donnees} />
                <Ligne icon={ScanText} libelle="Étiquettes (BAT)" res={visuel} />
            </div>
        </div>
    )
}
