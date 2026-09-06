import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { coutUsd, PLAFOND_MENSUEL_USD } from "@/agents/models"
import { getMoyennesParOperation, getUsageParAgent, getUsageParJour } from "@/db/queries/usage-ia"

import { JaugeBudget } from "./_components/jauge-budget"
import { TableauAgents } from "./_components/tableau-agents"
import { Tendance30j } from "./_components/tendance-30j"
import { formatEuros, formatTokens, LIBELLES_FAMILLE, totalUsd } from "./_components/libelles"

export default async function ConsommationPage() {
    const session = await auth()
    if (!session?.user) redirect("/login")

    const [parAgent, parJour, moyennes] = await Promise.all([
        getUsageParAgent(),
        getUsageParJour(30),
        getMoyennesParOperation(),
    ])

    const consommeUsd = totalUsd(parAgent)
    const appels = parAgent.reduce((acc, l) => acc + l.appels, 0)
    const tokens = parAgent.reduce((acc, l) => acc + l.tokensEntree + l.tokensSortie, 0)

    // "What does one import cost?" — grouped by business family, priced per model.
    const coutParFamille = new Map<string, { usd: number; operations: number }>()
    for (const m of moyennes) {
        const courant = coutParFamille.get(m.famille) ?? { usd: 0, operations: 0 }
        courant.usd += coutUsd(m.modele, m.tokensEntree, m.tokensSortie)
        courant.operations = Math.max(courant.operations, m.operations)
        coutParFamille.set(m.famille, courant)
    }

    return (
        <>
            <JaugeBudget consommeUsd={consommeUsd} plafondUsd={PLAFOND_MENSUEL_USD} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Indicateur libelle="Appels ce mois-ci" valeur={appels.toLocaleString("fr-FR")} />
                <Indicateur libelle="Tokens consommés" valeur={formatTokens(tokens)} />
                <Indicateur
                    libelle="Coût moyen par appel"
                    valeur={appels > 0 ? formatEuros(consommeUsd / appels) : "—"}
                />
            </div>

            <div className="rounded-2xl border-none bg-white/60 backdrop-blur-xl shadow-xl shadow-stone-200/50 p-8 dark:bg-stone-900/60">
                <h2 className="text-xl font-medium text-emerald-950 mb-1">Coût par opération</h2>
                <p className="text-sm text-stone-500 mb-6">
                    Ce que coûte réellement une action métier, ce mois-ci.
                </p>

                {coutParFamille.size === 0 ? (
                    <p className="text-sm text-stone-500 py-4 text-center">
                        Pas encore assez de données. Les chiffres apparaîtront dès les premiers
                        imports et audits du mois.
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {[...coutParFamille.entries()].map(([famille, { usd, operations }]) => (
                            <li
                                key={famille}
                                className="flex items-center justify-between gap-4 p-4 rounded-xl border border-stone-200/50 bg-white/40"
                            >
                                <div>
                                    <div className="font-medium text-stone-900">
                                        En moyenne, {LIBELLES_FAMILLE[famille] ?? famille} coûte
                                    </div>
                                    <div className="text-sm text-stone-500 mt-0.5">
                                        sur {operations} opération{operations > 1 ? "s" : ""} ce mois-ci
                                    </div>
                                </div>
                                <div className="text-2xl font-light text-emerald-900 tabular-nums shrink-0">
                                    {operations > 0 ? formatEuros(usd / operations) : "—"}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <TableauAgents lignes={parAgent} />
            <Tendance30j lignes={parJour} />
        </>
    )
}

function Indicateur({ libelle, valeur }: { libelle: string; valeur: string }) {
    return (
        <div className="rounded-2xl border-none bg-white/60 backdrop-blur-xl shadow-lg shadow-stone-200/40 p-5 dark:bg-stone-900/60">
            <div className="text-xs uppercase tracking-wider text-stone-400 font-medium">{libelle}</div>
            <div className="mt-2 text-2xl font-light text-emerald-950 tabular-nums">{valeur}</div>
        </div>
    )
}
