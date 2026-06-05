import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Provenance } from "@/lib/provenance";
import { ProvenanceBadge } from "@/components/provenance/ProvenanceBadge";

/** Very light block tint derived from the provenance, aligned on the repo. */
const BLOCK_TONE: Record<Provenance, string> = {
  EXTRAIT:
    "bg-amber-50/40 border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/60",
  CALCULE:
    "bg-indigo-50/40 border-indigo-200/60 dark:bg-indigo-950/20 dark:border-indigo-900/60",
  VALIDE:
    "bg-emerald-50/40 border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-900/60",
};

export interface ChampTraceProps {
  label: string;
  /** The displayed value (later: the edit input). */
  children: ReactNode;
  provenance: Provenance;
  source?: string;
  className?: string;
}

export function ChampTrace({
  label,
  children,
  provenance,
  source,
  className,
}: ChampTraceProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border p-3 transition-colors duration-300",
        BLOCK_TONE[provenance],
        className
      )}
    >
      <div className="absolute right-2 top-2">
        <ProvenanceBadge provenance={provenance} source={source} size="xs" />
      </div>
      <p className="pr-16 text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-stone-800 dark:text-stone-100">
        {children}
      </div>
    </div>
  );
}

export default ChampTrace;
