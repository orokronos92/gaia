"use client"

import { useRef, useState, useTransition } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Loader2,
  MinusCircle,
  ScanText,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  controleGraphismeAction,
  type ControleGraphismeResult,
} from "@/app/actions/controle-graphisme"
import type { ControlStatus } from "@/lib/audit/types"

const STATUS_STYLE: Record<
  ControlStatus,
  { label: string; chip: string; icon: typeof CheckCircle2; tone: string }
> = {
  FAIL: { label: "À corriger", chip: "border-red-200 text-red-700 bg-red-50", icon: XCircle, tone: "text-red-500" },
  WARNING: { label: "À vérifier", chip: "border-orange-200 text-orange-700 bg-orange-50", icon: AlertTriangle, tone: "text-orange-500" },
  PASS: { label: "Conforme", chip: "border-emerald-200 text-emerald-700 bg-emerald-50", icon: CheckCircle2, tone: "text-emerald-600" },
  NA: { label: "Non applicable", chip: "border-stone-200 text-stone-400 bg-stone-50", icon: MinusCircle, tone: "text-stone-300" },
}

/** Ce qui doit sauter aux yeux d'abord : ce qui bloque l'envoi à l'imprimeur. */
const ORDRE: ControlStatus[] = ["FAIL", "WARNING", "PASS", "NA"]

export interface FichePourControle {
  ficheId: string
  codePf: string
  denomination: string
}

interface ControleGraphismeClientProps {
  fiches: FichePourControle[]
}

export function ControleGraphismeClient({ fiches }: ControleGraphismeClientProps) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<ControleGraphismeResult | null>(null)
  const [noms, setNoms] = useState<string[]>([])
  const formRef = useRef<HTMLFormElement>(null)

  const lancer = (formData: FormData) =>
    startTransition(async () => setResult(await controleGraphismeAction(formData)))

  const checks = result?.checks ?? []
  const tries = ORDRE.flatMap((s) => checks.filter((c) => c.statut === s))
  const counts = result?.counts

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        action={lancer}
        className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-sm space-y-4 dark:bg-stone-900 dark:border-stone-800"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-semibold text-stone-700 dark:text-stone-200">Produit</span>
            <select
              name="ficheId"
              required
              defaultValue=""
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-emerald-400 dark:bg-stone-950 dark:border-stone-700 dark:text-stone-100"
            >
              <option value="" disabled>
                Choisir le produit du BAT…
              </option>
              {fiches.map((f) => (
                <option key={f.ficheId} value={f.ficheId}>
                  {f.codePf} — {f.denomination}
                </option>
              ))}
            </select>
            <span className="block text-xs text-stone-400">
              Le BAT est comparé aux données de cette fiche.
            </span>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="font-semibold text-stone-700 dark:text-stone-200">
              Faces du BAT (PDF)
            </span>
            <input
              type="file"
              name="faces"
              accept="application/pdf"
              multiple
              required
              onChange={(e) => setNoms([...(e.target.files ?? [])].map((f) => f.name))}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-stone-700 dark:bg-stone-950 dark:border-stone-700"
            />
            <span className="block text-xs text-stone-400">
              {noms.length > 0 ? noms.join(", ") : "Recto, verso… jusqu'à 6 faces."}
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-stone-400">
            Rien n&apos;est enregistré : ni le fichier, ni le résultat. Le contrôle de la
            Qualité reste entier.
          </p>
          <Button type="submit" disabled={isPending} size="sm">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
            {isPending ? "Mesure…" : "Contrôler"}
          </Button>
        </div>
      </form>

      {result && !result.ok && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {result.error}
        </p>
      )}

      {result?.refusees && result.refusees.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
          <p className="flex items-center gap-2 font-semibold">
            <FileWarning className="h-4 w-4" /> Faces écartées
          </p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {result.refusees.map((f) => (
              <li key={f.nom}>
                {f.nom} — {f.raison}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result?.ok && (
        <div className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-sm space-y-4 dark:bg-stone-900 dark:border-stone-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100">
                {tries.length} contrôle{tries.length > 1 ? "s" : ""} mesuré
                {tries.length > 1 ? "s" : ""}
              </h2>
              <p className="text-xs text-stone-400">Faces lues : {result.faces?.join(", ")}</p>
            </div>
            <div className="flex gap-1.5">
              {ORDRE.filter((s) => (counts?.[s] ?? 0) > 0).map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className={cn("px-2 py-0.5 text-[10px] font-bold uppercase", STATUS_STYLE[s].chip)}
                >
                  {counts?.[s]} {STATUS_STYLE[s].label}
                </Badge>
              ))}
            </div>
          </div>

          <ul className="space-y-2">
            {tries.map((c) => {
              const style = STATUS_STYLE[c.statut]
              const Icon = style.icon
              return (
                <li
                  key={c.id}
                  className="flex gap-3 rounded-xl border border-stone-100 px-3 py-2.5 dark:border-stone-800"
                >
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.tone)} />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                        {c.libelle}
                      </span>
                      {c.checklistId && (
                        <span className="text-[10px] font-mono text-stone-400">
                          point {c.checklistId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-stone-500">{c.justification}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
