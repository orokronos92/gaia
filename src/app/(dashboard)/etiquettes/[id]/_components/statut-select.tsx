"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { updateStatutEtiquetteAction } from "@/app/actions/etiquettes"
import { LIBELLES_STATUT, STATUTS_ORDONNES } from "@/lib/etiquettes/statuts"

/**
 * Manual workflow-status selector on the fiche header. Marie may set any status
 * (no transition rules yet — a workflow engine may come later). Persists via the
 * server action, which audit-logs the change and revalidates the page.
 */

/** Ordered statuses + readable French labels, from the shared source. */
const STATUTS: { value: string; label: string }[] = STATUTS_ORDONNES.map((value) => ({
    value,
    label: LIBELLES_STATUT[value],
}))

interface StatutSelectProps {
    ficheId: string
    statut: string
}

export function StatutSelect({ ficheId, statut }: StatutSelectProps) {
    const [pending, startTransition] = useTransition()
    // Optimistic value so the controlled select doesn't snap back while saving.
    const [value, setValue] = useState(statut)
    useEffect(() => setValue(statut), [statut])

    const onChange = (next: string) => {
        if (next === value) return
        const prev = value
        setValue(next)
        startTransition(async () => {
            try {
                await updateStatutEtiquetteAction({ ficheId, statut: next })
                const label = STATUTS.find((s) => s.value === next)?.label ?? next
                toast.success("Statut mis à jour", { description: label })
            } catch {
                setValue(prev)
                toast.error("Échec de la mise à jour du statut")
            }
        })
    }

    return (
        <div className="relative inline-flex items-center">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={pending}
                aria-label="Statut de la fiche"
                className={cn(
                    "appearance-none cursor-pointer rounded-md border border-emerald-200 bg-emerald-100 py-1 pl-3 pr-8 text-sm font-semibold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-60",
                    pending && "cursor-wait"
                )}
            >
                {STATUTS.map((s) => (
                    <option key={s.value} value={s.value}>
                        {s.label}
                    </option>
                ))}
            </select>
            {pending ? (
                <Loader2 className="pointer-events-none absolute right-2 h-3.5 w-3.5 animate-spin text-emerald-700" />
            ) : (
                <svg className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-emerald-700" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </div>
    )
}

export default StatutSelect
