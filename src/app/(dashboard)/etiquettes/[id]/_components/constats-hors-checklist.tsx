"use client"

import { AlertTriangle, CheckCircle2, MinusCircle, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import type { BatTextCheck } from "@/lib/audit/visual/text-robot"
import type { ControlStatus } from "@/lib/audit/types"

const STYLE: Record<ControlStatus, { icon: typeof CheckCircle2; tone: string }> = {
    FAIL: { icon: XCircle, tone: "text-red-500" },
    WARNING: { icon: AlertTriangle, tone: "text-orange-500" },
    PASS: { icon: CheckCircle2, tone: "text-emerald-600" },
    NA: { icon: MinusCircle, tone: "text-stone-300" },
}

/**
 * Ce que l'analyse du BAT a trouvé sans qu'aucun point du registre ne le couvre.
 *
 * La comparaison mot à mot de la liste d'ingrédients en est l'exemple : elle
 * n'est rattachée à aucun point, parce que le 2.2 porte sur l'ordre décroissant
 * et non sur l'identité littérale — le rattacher produisait de faux « à
 * corriger ». Mais c'est elle qui fait remonter qu'une recette dit « miel bio »
 * là où l'étiquette dit « miel ».
 *
 * Sans cette section, réunir les deux écrans ferait disparaître exactement le
 * genre de divergence que la Qualité doit arbitrer.
 */
export function ConstatsHorsChecklist({ checks }: { checks: BatTextCheck[] }) {
    if (checks.length === 0) return null

    return (
        <section className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-stone-500">
                Constats hors checklist
            </h3>
            <p className="mt-1 text-xs text-stone-400">
                Relevés sur le BAT, sans point du registre pour les porter — à arbitrer.
            </p>
            <ul className="mt-3 space-y-2">
                {checks.map((c) => {
                    const style = STYLE[c.statut]
                    const Icon = style.icon
                    return (
                        <li
                            key={c.id}
                            className="flex gap-3 rounded-xl border border-stone-100 px-3 py-2.5"
                        >
                            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.tone)} />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-stone-800">{c.libelle}</p>
                                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                                    {c.justification}
                                </p>
                                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                                    {c.rubrique}
                                </span>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
