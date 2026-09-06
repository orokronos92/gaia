import { coutUsd } from "@/agents/models"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { formatEuros, formatTokens, LIBELLES_AGENT, type LigneAgent } from "./libelles"

interface TableauAgentsProps {
    lignes: LigneAgent[]
}

/**
 * Cost per agent. Each row is priced with its own model's rate — `mistral-medium`
 * costs five times `mistral-large` per token, so a single blended rate would lie.
 */
export function TableauAgents({ lignes }: TableauAgentsProps) {
    const triees = [...lignes]
        .map((l) => ({ ...l, usd: coutUsd(l.modele, l.tokensEntree, l.tokensSortie) }))
        .sort((a, b) => b.usd - a.usd)

    return (
        <div className="rounded-2xl border-none bg-white/60 backdrop-blur-xl shadow-xl shadow-stone-200/50 p-8 dark:bg-stone-900/60">
            <h2 className="text-xl font-medium text-emerald-950 mb-1">Répartition par agent</h2>
            <p className="text-sm text-stone-500 mb-6">Depuis le 1<sup>er</sup> du mois en cours.</p>

            {triees.length === 0 ? (
                <p className="text-sm text-stone-500 py-8 text-center">
                    Aucun appel enregistré ce mois-ci.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Agent</TableHead>
                                <TableHead className="text-right">Appels</TableHead>
                                <TableHead className="text-right">Tokens</TableHead>
                                <TableHead className="text-right">Coût</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {triees.map((l) => (
                                <TableRow key={`${l.agent}-${l.modele}`}>
                                    <TableCell>
                                        <div className="font-medium text-stone-900">
                                            {LIBELLES_AGENT[l.agent] ?? l.agent}
                                        </div>
                                        <div className="text-xs text-stone-400 font-mono">{l.modele}</div>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{l.appels}</TableCell>
                                    <TableCell className="text-right tabular-nums text-stone-500">
                                        {formatTokens(l.tokensEntree + l.tokensSortie)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums font-medium">
                                        {formatEuros(l.usd)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
