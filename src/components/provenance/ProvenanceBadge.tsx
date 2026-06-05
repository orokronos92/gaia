import { Bot, CheckCircle2, FileSearch, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Provenance } from "@/lib/provenance";

interface ProvenanceConfig {
  label: string;
  Icon: LucideIcon;
  /** Palette systematised from the existing repo (amber / indigo / emerald). */
  className: string;
  /** Default tooltip wording when a raw source is not interpolated. */
  hint: string;
}

const PROVENANCE_CONFIG: Record<Provenance, ProvenanceConfig> = {
  EXTRAIT: {
    label: "Word",
    Icon: FileSearch,
    className:
      "bg-amber-50/60 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    hint: "Extrait du document Word — à vérifier",
  },
  CALCULE: {
    label: "IA",
    Icon: Bot,
    className:
      "bg-indigo-50/50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900",
    hint: "Proposé par l'IA — à valider",
  },
  VALIDE: {
    label: "Validé",
    Icon: CheckCircle2,
    className:
      "bg-emerald-50/60 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    hint: "Validé par Marie — source de vérité",
  },
};

const SIZE_CLASSES: Record<NonNullable<ProvenanceBadgeProps["size"]>, string> = {
  xs: "text-[9px] px-1.5 py-0 gap-1 [&>svg]:size-2.5",
  sm: "text-[10px] px-2 py-0.5 gap-1 [&>svg]:size-3",
};

export interface ProvenanceBadgeProps {
  provenance: Provenance;
  /** Optional original source text, shown in a tooltip on hover. */
  source?: string;
  /** `xs` for dense table cells, `sm` elsewhere. */
  size?: "xs" | "sm";
  className?: string;
}

export function ProvenanceBadge({
  provenance,
  source,
  size = "sm",
  className,
}: ProvenanceBadgeProps) {
  const { label, Icon, className: toneClasses, hint } =
    PROVENANCE_CONFIG[provenance];

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "font-bold uppercase tracking-widest transition-colors duration-300",
        toneClasses,
        SIZE_CLASSES[size],
        className
      )}
    >
      <Icon aria-hidden />
      {label}
    </Badge>
  );

  // Tooltip surfaces the raw Word text for EXTRAIT, otherwise the default hint.
  const tooltip =
    provenance === "EXTRAIT" && source
      ? `Word : « ${source} »`
      : source ?? hint;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{badge}</span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export default ProvenanceBadge;
