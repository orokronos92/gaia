import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** Explicit "non renseigné" message, e.g. "Grille organoleptique non renseignée". */
  label: string;
  /** Optional lucide icon, rendered discreetly above the label. */
  icon?: LucideIcon;
  className?: string;
}

/**
 * Discreet placeholder shown inside a card/section when its data is missing.
 *
 * The fiche renders every card unconditionally so Marie (Qualité) sees the gaps
 * to fill instead of believing a section does not exist. This is the visual cue
 * for that gap: secondary, italic, centred, dashed border — never alarming.
 */
export function EmptyState({ label, icon: Icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 px-4 py-6 text-center",
        className
      )}
    >
      {Icon && <Icon className="size-5 text-stone-300" aria-hidden />}
      <p className="text-sm italic text-stone-400">{label}</p>
    </div>
  );
}

export default EmptyState;
