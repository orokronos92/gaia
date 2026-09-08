"use client"

import { useState } from "react"
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { CONTROL_CHECKLIST } from "@/lib/audit/control-checklist"
import { CONTROL_SECTIONS, type ControlPoint, type ControlResult, type ControlStatus } from "@/lib/audit/types"

const SECTION_LABELS: Record<(typeof CONTROL_SECTIONS)[number], string> = {
    DENOMINATION: "Dénomination",
    INGREDIENTS: "Liste des ingrédients",
    QUID: "QUID",
    NUTRITION: "Déclaration nutritionnelle",
    PARTICULARITES: "Particularités",
    QUANTITE_NETTE: "Quantité nette",
    CONSERVATION: "Conservation / utilisation",
    ORIGINE: "Origine géographique",
    FABRICANT: "Fabricant",
    GENCODE: "Gencode",
    METROLOGIE: "Métrologie",
    PICTOGRAMMES: "Pictogrammes",
    LABELS: "Labels",
    TYPOGRAPHIE: "Typographie",
    CODE_ETIQUETTE: "Code étiquette",
    CODE_ARTICLE: "Code article & Gencode",
}

const STATUS_STYLE: Record<ControlStatus, { label: string; chip: string; icon: typeof CheckCircle2; tone: string }> = {
    PASS: { label: "Conforme", chip: "border-emerald-200 text-emerald-700 bg-emerald-50", icon: CheckCircle2, tone: "text-emerald-600" },
    WARNING: { label: "À vérifier", chip: "border-orange-200 text-orange-700 bg-orange-50", icon: AlertTriangle, tone: "text-orange-500" },
    FAIL: { label: "Non conforme", chip: "border-red-200 text-red-700 bg-red-50", icon: XCircle, tone: "text-red-500" },
    NA: { label: "Non applicable", chip: "border-stone-200 text-stone-400 bg-stone-50", icon: MinusCircle, tone: "text-stone-300" },
}

const REGISTRY: Map<string, ControlPoint> = new Map(CONTROL_CHECKLIST.map((c) => [c.id, c]))

interface AuditResultListProps {
    results: ControlResult[]
}

export function AuditResultList({ results }: AuditResultListProps) {
    const [showNA, setShowNA] = useState(false)

    const naCount = results.filter((r) => r.statut === "NA").length
    const visible = showNA ? results : results.filter((r) => r.statut !== "NA")

    return (
        <div className="space-y-6">
            {naCount > 0 && (
                <button
                    onClick={() => setShowNA((v) => !v)}
                    className="text-xs font-semibold text-stone-500 hover:text-stone-700 flex items-center gap-1.5 transition-colors"
                >
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showNA && "rotate-180")} />
                    {showNA ? "Masquer" : "Afficher"} les {naCount} contrôle(s) non applicable(s)
                </button>
            )}

            {CONTROL_SECTIONS.map((section) => {
                const rows = visible.filter((r) => REGISTRY.get(r.id)?.section === section)
                if (rows.length === 0) return null
                return (
                    <section key={section} className="space-y-2">
                        <h4 className="text-xs font-extrabold uppercase tracking-widest text-stone-400 pl-1">
                            {SECTION_LABELS[section]}
                        </h4>
                        <div className="space-y-2">
                            {rows.map((r) => {
                                const point = REGISTRY.get(r.id)
                                const style = STATUS_STYLE[r.statut]
                                const Icon = style.icon
                                return (
                                    <div
                                        key={r.id}
                                        className={cn(
                                            "flex gap-3 p-4 bg-white border border-stone-200/70 rounded-2xl shadow-sm",
                                            r.statut === "NA" && "opacity-60"
                                        )}
                                    >
                                        <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", style.tone)} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-sm font-semibold text-stone-800 leading-snug">
                                                    {point?.libelle ?? r.typeControle}
                                                </span>
                                                <Badge variant="outline" className={cn("text-[10px] px-2 py-0 font-bold uppercase shrink-0", style.chip)}>
                                                    {style.label}
                                                </Badge>
                                            </div>
                                            {r.justification && (
                                                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">{r.justification}</p>
                                            )}
                                            {r.suggestionIa && (
                                                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">→ {r.suggestionIa}</p>
                                            )}
                                            {point?.reference && (
                                                <p className="text-[10px] text-stone-300 mt-1 font-mono">{point.reference}</p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )
            })}
        </div>
    )
}
