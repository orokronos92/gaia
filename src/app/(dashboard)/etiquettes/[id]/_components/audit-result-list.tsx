"use client"

import { useState } from "react"
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, CircleDashed, ChevronDown, Crosshair } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { CONTROL_CHECKLIST } from "@/lib/audit/control-checklist"
import { CONTROL_SECTIONS, type ControlAction, type ControlPoint, type ControlResult } from "@/lib/audit/types"
import { ValidationLigne } from "./validation-ligne"

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

/**
 * L'axe d'affichage est ce qu'il RESTE À FAIRE, pas le verdict brut.
 * Un même WARNING veut dire « complète la fiche » ou « regarde le BAT » ; ce ne
 * sont pas les mêmes gestes, et Marie doit les distinguer d'un coup d'œil.
 */
const ACTION_STYLE: Record<ControlAction, { label: string; chip: string; icon: typeof CheckCircle2; tone: string }> = {
    CORRIGER: { label: "À corriger", chip: "border-red-200 text-red-700 bg-red-50", icon: XCircle, tone: "text-red-500" },
    COMPLETER: { label: "À compléter", chip: "border-sky-200 text-sky-700 bg-sky-50", icon: CircleDashed, tone: "text-sky-500" },
    VERIFIER: { label: "À vérifier", chip: "border-orange-200 text-orange-700 bg-orange-50", icon: AlertTriangle, tone: "text-orange-500" },
    RIEN: { label: "Vérifié", chip: "border-emerald-200 text-emerald-700 bg-emerald-50", icon: CheckCircle2, tone: "text-emerald-600" },
}

const NON_APPLICABLE = { label: "Non applicable", chip: "border-stone-200 text-stone-400 bg-stone-50", icon: MinusCircle, tone: "text-stone-300" }

/** Ordre de lecture : d'abord ce qui bloque, puis ce qui manque, puis le reste. */
const ORDRE_ACTIONS: ControlAction[] = ["CORRIGER", "COMPLETER", "VERIFIER", "RIEN"]

function styleDe(r: ControlResult) {
    if (r.statut === "NA") return NON_APPLICABLE
    return ACTION_STYLE[r.action ?? "VERIFIER"]
}

const REGISTRY: Map<string, ControlPoint> = new Map(CONTROL_CHECKLIST.map((c) => [c.id, c]))

interface AuditResultListProps {
    results: ControlResult[]
    ficheId: string
    /** Relance la checklist après une décision de la Qualité. */
    onChange: () => void
    /** Montre sur le BAT ce dont ce point parle. */
    onVoir?: (r: ControlResult) => void
    /** Point actuellement montré dans le volet. */
    pointVu?: string
}

export function AuditResultList({ results, ficheId, onChange, onVoir, pointVu }: AuditResultListProps) {
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

            {ORDRE_ACTIONS.map((action) => {
                const duGroupe = visible.filter((r) => r.statut !== "NA" && (r.action ?? "VERIFIER") === action)
                if (duGroupe.length === 0) return null
                const entete = ACTION_STYLE[action]

                return (
                    <section key={action} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <entete.icon className={cn("h-4 w-4", entete.tone)} />
                            <h4 className="text-xs font-extrabold uppercase tracking-widest text-stone-500">
                                {entete.label}
                            </h4>
                            <span className="text-xs text-stone-400">({duGroupe.length})</span>
                        </div>
                        <div className="space-y-2">
                            {duGroupe.map((r) => (
                                <Ligne key={r.id} r={r} point={REGISTRY.get(r.id)} ficheId={ficheId} onChange={onChange} onVoir={onVoir} vu={pointVu === r.id} />
                            ))}
                        </div>
                    </section>
                )
            })}

            {showNA && (
                <section className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-stone-400">
                        Non applicables
                    </h4>
                    {visible
                        .filter((r) => r.statut === "NA")
                        .map((r) => (
                            <Ligne key={r.id} r={r} point={REGISTRY.get(r.id)} ficheId={ficheId} onChange={onChange} onVoir={onVoir} vu={pointVu === r.id} />
                        ))}
                </section>
            )}
        </div>
    )
}

/** Une ligne de la checklist : ce qu'il faut faire, pourquoi, et sur quel texte. */
function Ligne({
    r,
    point,
    ficheId,
    onChange,
    onVoir,
    vu,
}: {
    r: ControlResult
    point?: ControlPoint
    ficheId: string
    onChange: () => void
    onVoir?: (r: ControlResult) => void
    vu?: boolean
}) {
    const style = styleDe(r)
    const Icon = style.icon
    return (
        <div
            className={cn(
                "flex gap-3 p-4 bg-white border rounded-2xl shadow-sm transition-colors",
                vu ? "border-amber-300 ring-2 ring-amber-200" : "border-stone-200/70",
                r.statut === "NA" && "opacity-60"
            )}
        >
            <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", style.tone)} />
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-stone-800 leading-snug">
                        {point?.libelle ?? r.typeControle}
                    </span>
                    <Badge
                        variant="outline"
                        className={cn("text-[10px] px-2 py-0 font-bold uppercase shrink-0", style.chip)}
                    >
                        {style.label}
                    </Badge>
                </div>
                {r.justification && (
                    <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">{r.justification}</p>
                )}
                {r.suggestionIa && (
                    <p className="text-xs text-emerald-700 mt-1 leading-relaxed">→ {r.suggestionIa}</p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {point && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                            {SECTION_LABELS[point.section]}
                        </span>
                    )}
                    {point?.reference && (
                        <p className="text-[10px] text-stone-300 font-mono">{point.reference}</p>
                    )}
                    {r.mode !== "deterministic" && (
                        <span className="text-[10px] text-stone-400">
                            {r.mode === "manual" ? "contrôle visuel" : "à évaluer"}
                        </span>
                    )}
                    {/* Le contrôle sait où il a mesuré : autant le montrer. */}
                    {onVoir && r.reperes && r.reperes.length > 0 && (
                        <button
                            onClick={() => onVoir(r)}
                            className={cn(
                                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors",
                                vu
                                    ? "bg-amber-100 text-amber-800"
                                    : "text-stone-400 hover:bg-amber-50 hover:text-amber-700"
                            )}
                        >
                            <Crosshair className="h-3 w-3" />
                            Voir sur le BAT
                        </button>
                    )}
                </div>
                {/* Un point non applicable n'appelle aucune décision. */}
                {r.statut !== "NA" && (
                    <ValidationLigne ficheId={ficheId} r={r} onChange={onChange} />
                )}
            </div>
        </div>
    )
}
