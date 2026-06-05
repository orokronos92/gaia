import { Scale } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ArbitrerBadgeProps {
  label?: string;
  className?: string;
}

/**
 * Neutral "À ARBITRER" marker — intentionally distinct (dashed, stone) from the
 * 3 provenance states so it does not pollute the EXTRAIT / CALCULE / VALIDE
 * semantics. Flags a business decision the team (Marie) must settle (SPEC-03 §6).
 */
export function ArbitrerBadge({
  label = "À arbitrer",
  className,
}: ArbitrerBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-dashed border-stone-300 bg-stone-100/70 text-[9px] font-bold uppercase tracking-widest text-stone-600 dark:border-stone-600 dark:bg-stone-800/60 dark:text-stone-300",
        className
      )}
    >
      <Scale className="size-2.5" aria-hidden />
      {label}
    </Badge>
  );
}

export default ArbitrerBadge;
