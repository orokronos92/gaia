import { coutUsd } from "@/agents/models"
import type { UsageParJour } from "@/db/queries/usage-ia"

import { formatEuros } from "./libelles"

interface Tendance30jProps {
    lignes: UsageParJour[]
    jours?: number
}

/**
 * Daily cost over the last N days, drawn with plain CSS bars rather than a chart
 * library — a new dependency is not worth it for one sparkline, and the artifact
 * has to stay readable on a laptop during a client demo.
 */
export function Tendance30j({ lignes, jours = 30 }: Tendance30jProps) {
    const parJour = new Map<string, number>()
    for (const l of lignes) {
        const usd = coutUsd(l.modele, l.tokensEntree, l.tokensSortie)
        parJour.set(l.jour, (parJour.get(l.jour) ?? 0) + usd)
    }

    // Fill the gaps: a day with no call must show as an empty slot, not vanish.
    const aujourdhui = new Date()
    const serie: { jour: string; usd: number }[] = []
    for (let i = jours - 1; i >= 0; i--) {
        const d = new Date(aujourdhui)
        d.setDate(d.getDate() - i)
        const cle = d.toISOString().slice(0, 10)
        serie.push({ jour: cle, usd: parJour.get(cle) ?? 0 })
    }

    const max = Math.max(...serie.map((s) => s.usd), 0)
    const total = serie.reduce((acc, s) => acc + s.usd, 0)

    return (
        <div className="rounded-2xl border-none bg-white/60 backdrop-blur-xl shadow-xl shadow-stone-200/50 p-8 dark:bg-stone-900/60">
            <div className="flex items-baseline justify-between gap-4 flex-wrap mb-6">
                <div>
                    <h2 className="text-xl font-medium text-emerald-950">Tendance sur {jours} jours</h2>
                    <p className="text-sm text-stone-500 mt-0.5">Coût quotidien, tous agents confondus.</p>
                </div>
                <div className="text-sm text-stone-500 tabular-nums">
                    total {formatEuros(total)}
                </div>
            </div>

            {max === 0 ? (
                <p className="text-sm text-stone-500 py-8 text-center">
                    Aucun appel sur la période.
                </p>
            ) : (
                <div className="flex items-end gap-[3px] h-28" aria-hidden="true">
                    {serie.map((s) => (
                        <div
                            key={s.jour}
                            title={`${new Date(s.jour).toLocaleDateString("fr-FR")} — ${formatEuros(s.usd)}`}
                            className="flex-1 rounded-t-sm bg-emerald-600/80 hover:bg-emerald-700 transition-colors min-h-[2px]"
                            style={{ height: `${Math.max((s.usd / max) * 100, s.usd > 0 ? 4 : 1)}%` }}
                        />
                    ))}
                </div>
            )}

            <div className="mt-2 flex justify-between text-xs text-stone-400">
                <span>{new Date(serie[0].jour).toLocaleDateString("fr-FR")}</span>
                <span>aujourd&apos;hui</span>
            </div>
        </div>
    )
}
