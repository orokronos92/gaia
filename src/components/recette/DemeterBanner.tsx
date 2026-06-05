import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { ProvenanceBadge } from "@/components/provenance/ProvenanceBadge";
import type { DemeterEvaluation } from "@/lib/business-rules/recette";

export interface DemeterBannerProps {
  demeter: DemeterEvaluation;
  className?: string;
}

type Ton = "emerald" | "amber" | "red";

// Color by band (SPEC-03 §3): ≥90 % émeraude, 66–90 % ambre, <66 % rouge.
const TONES: Record<Ton, { card: string; icon: string; pct: string }> = {
  emerald: {
    card: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
    pct: "text-emerald-800 dark:text-emerald-200",
  },
  amber: {
    card: "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
    pct: "text-amber-800 dark:text-amber-200",
  },
  red: {
    card: "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30",
    icon: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300",
    pct: "text-red-800 dark:text-red-200",
  },
};

const tonFor = (pct: number): Ton =>
  pct >= 90 ? "emerald" : pct >= 66 ? "amber" : "red";

export function DemeterBanner({ demeter, className }: DemeterBannerProps) {
  const ton = TONES[tonFor(demeter.pourcentageDemeter)];

  return (
    <div
      className={cn(
        "relative flex items-start gap-4 rounded-2xl border p-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]",
        ton.card,
        className
      )}
    >
      <div className="absolute right-3 top-3">
        <ProvenanceBadge provenance="CALCULE" size="xs" />
      </div>

      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          ton.icon
        )}
      >
        <ShieldCheck className="size-5" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
          Conformité Demeter
        </p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className={cn("text-2xl font-light tracking-tight tabular-nums", ton.pct)}>
            {demeter.pourcentageDemeter}%
          </span>
          <span className="text-sm font-medium text-stone-600 dark:text-stone-300">
            Tranche {demeter.tranche}
          </span>
        </div>
        <p className="mt-1 pr-16 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
          {demeter.consequenceEtiquetage}
        </p>
      </div>
    </div>
  );
}

export default DemeterBanner;
