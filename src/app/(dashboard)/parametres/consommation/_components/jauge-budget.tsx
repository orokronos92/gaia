import { AlertTriangle } from "lucide-react"

import { formatDollars, formatEuros } from "./libelles"

interface JaugeBudgetProps {
    consommeUsd: number
    plafondUsd: number
}

const SEUIL_ALERTE = 0.8

/**
 * Monthly budget gauge. The cap lives on the Mistral workspace, not here: past
 * it the API answers 429 and every agent stops, so this is the one figure that
 * turns an invisible outage into something anticipated.
 */
export function JaugeBudget({ consommeUsd, plafondUsd }: JaugeBudgetProps) {
    const ratio = plafondUsd > 0 ? consommeUsd / plafondUsd : 0
    const pourcent = Math.min(ratio, 1) * 100
    const alerte = ratio >= SEUIL_ALERTE

    return (
        <div className="rounded-2xl border-none bg-white/60 backdrop-blur-xl shadow-xl shadow-stone-200/50 p-8 dark:bg-stone-900/60">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-xl font-medium text-emerald-950">Budget du mois</h2>
                    <p className="text-sm text-stone-500 mt-0.5">
                        Plafond fixé sur l&apos;abonnement Mistral. Au-delà, les agents s&apos;arrêtent
                        jusqu&apos;au 1<sup>er</sup> du mois suivant.
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-light text-emerald-950 tabular-nums">
                        {formatEuros(consommeUsd)}
                    </div>
                    <div className="text-xs text-stone-500 tabular-nums">
                        {formatDollars(consommeUsd)} sur {formatDollars(plafondUsd)}
                    </div>
                </div>
            </div>

            <div
                className="mt-6 h-3 w-full rounded-full bg-stone-100 overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(pourcent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Consommation du budget mensuel"
            >
                <div
                    className={alerte ? "h-full rounded-full bg-amber-500" : "h-full rounded-full bg-emerald-600"}
                    style={{ width: `${Math.max(pourcent, consommeUsd > 0 ? 1 : 0)}%` }}
                />
            </div>

            <div className="mt-2 text-xs text-stone-500 tabular-nums">
                {pourcent < 1 && consommeUsd > 0 ? "moins de 1 %" : `${Math.round(pourcent)} %`} du plafond
            </div>

            {alerte && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900">
                        Le budget approche du plafond. Relevez-le dans la console Mistral
                        (Admin Panel → Subscription) avant la coupure, ou attendez le mois prochain.
                    </p>
                </div>
            )}
        </div>
    )
}
