"use client";

import { Check, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

export interface RecetteTotauxProps {
  /** Live sum of the entered % (always shown, even with incomplete lines). */
  total: number | null;
  conforme: boolean;
  nbIncomplets: number;
  masseLot: number | null;
}

/**
 * Prominent, always-live recipe totals (SPEC-03b feedback): the % sum is THE
 * key figure for Marie, so it is large and colour-coded — green only at exactly
 * 100, red otherwise — and it keeps computing even while lines are incomplete so
 * she sees the effective percentage at a glance.
 */
export function RecetteTotaux({
  total,
  conforme,
  nbIncomplets,
  masseLot,
}: RecetteTotauxProps) {
  const val = total ?? 0;
  const delta = Math.round((val - 100) * 100) / 100;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 px-5 py-3.5 shadow-sm",
        conforme
          ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30"
          : "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/25"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-stone-500">
          Total ingrédients
        </span>
        <span
          className={cn(
            "text-3xl font-bold tabular-nums",
            conforme
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {val.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %
        </span>
        {conforme ? (
          <Check className="size-6 text-emerald-600" aria-hidden />
        ) : (
          <span className="rounded-lg bg-red-100 px-2 py-0.5 text-sm font-bold tabular-nums text-red-700 dark:bg-red-900/50 dark:text-red-300">
            {delta > 0 ? "+" : ""}
            {delta} vs 100
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm">
        {nbIncomplets > 0 && (
          <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
            <AlertTriangle className="size-4" aria-hidden />
            {nbIncomplets} à compléter
          </span>
        )}
        <span className="text-stone-500 dark:text-stone-400">
          Lot calculé :{" "}
          <span className="font-semibold tabular-nums text-stone-800 dark:text-stone-100">
            {masseLot != null && masseLot > 0
              ? `${Math.round(masseLot * 1000) / 1000} kg`
              : "—"}
          </span>
        </span>
      </div>
    </div>
  );
}

export default RecetteTotaux;
