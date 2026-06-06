"use client";

import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Pas, UnitMode } from "@/lib/recette/types";

export interface RecetteCalculatorToolbarProps {
  unitMode: UnitMode;
  pas: Pas;
  masseLotKg: number | null;
  masseRequise: boolean;
  onUnitMode: (m: UnitMode) => void;
  onPas: (p: Pas) => void;
  onMasse: (v: number | null) => void;
  onAjouter: () => void;
}

function Segment<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-xl border border-stone-200 bg-stone-100/80 p-0.5 dark:border-stone-700 dark:bg-stone-800/60"
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums transition-all",
            value === o.value
              ? "bg-white text-emerald-800 shadow-sm dark:bg-stone-900 dark:text-emerald-200"
              : "text-stone-500 hover:text-stone-700 dark:text-stone-400"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function RecetteCalculatorToolbar({
  unitMode,
  pas,
  masseLotKg,
  masseRequise,
  onUnitMode,
  onPas,
  onMasse,
  onAjouter,
}: RecetteCalculatorToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-stone-200/60 bg-white/70 p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
      <div className="space-y-1.5">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">
          Unité de saisie
        </span>
        <Segment
          ariaLabel="Unité de saisie"
          value={unitMode}
          onChange={(v) => onUnitMode(v as UnitMode)}
          options={[
            { value: "kg", label: "kg" },
            { value: "pct", label: "%" },
          ]}
        />
      </div>

      <div className="space-y-1.5">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">
          Masse du lot
        </span>
        <div className="relative">
          <Input
            type="text"
            inputMode="decimal"
            value={masseLotKg ?? ""}
            onChange={(e) => {
              const clean = e.target.value.trim().replace(",", ".");
              onMasse(clean === "" ? null : Number(clean));
            }}
            placeholder="16.08"
            className={cn(
              "w-32 pr-9 tabular-nums",
              masseRequise &&
                "border-amber-300 bg-amber-50/60 focus-visible:ring-amber-300 dark:border-amber-700 dark:bg-amber-950/30"
            )}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400">
            kg
          </span>
        </div>
      </div>

      <div className="ml-auto flex items-end gap-4">
        <div
          className="space-y-1.5"
          title="Précision d'arrondi de la liste d'ingrédients (PRO-QHS-013)"
        >
          <span className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">
            Pas d&apos;arrondi
          </span>
          <Segment
            ariaLabel="Pas d'arrondi"
            value={pas}
            onChange={(v) => onPas(Number(v) as Pas)}
            options={[
              { value: 0.5, label: "0,5" },
              { value: 1, label: "1" },
            ]}
          />
        </div>

        <Button
          type="button"
          onClick={onAjouter}
          className="rounded-xl bg-emerald-600 font-medium text-white shadow-sm shadow-emerald-700/20 hover:bg-emerald-700"
        >
          <Plus className="mr-1.5 size-4" /> Ajouter un ingrédient
        </Button>
      </div>
    </div>
  );
}

export default RecetteCalculatorToolbar;
