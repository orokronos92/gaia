import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ProvenanceBadge } from "@/components/provenance/ProvenanceBadge";
import { controleTotal } from "@/lib/business-rules/recette";
import type { Provenance } from "@/lib/provenance";
import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent";

type Ligne = RecetteAgentOutput["ingredients"][number];

export interface RecetteTableProps {
  data: RecetteAgentOutput;
  /** Edit mode is wired but disabled today (SPEC-03 §7). */
  editable?: boolean;
}

function ColHead({
  label,
  provenance,
  className,
}: {
  label: string;
  provenance?: Provenance;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
        {label}
      </span>
      {provenance && <ProvenanceBadge provenance={provenance} size="xs" />}
    </div>
  );
}

function Pastille({ on, ton }: { on: boolean; ton: "emerald" | "indigo" }) {
  if (!on) return <span className="text-stone-300 dark:text-stone-600">—</span>;
  return (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-full text-xs font-bold",
        ton === "emerald"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
          : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
      )}
    >
      ✱
    </span>
  );
}

export function RecetteTable({ data, editable = false }: RecetteTableProps) {
  const rows: Ligne[] = [...data.ingredients].sort(
    (a, b) => a.ordreTri - b.ordreTri
  );
  const { total, conforme } = controleTotal(
    rows.map((r) => r.pourcentageEtiquette)
  );
  const ecart = Math.round((total - 100) * 100) / 100;

  return (
    <ScrollArea className="w-full rounded-2xl border border-stone-100 bg-white/70 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8" />
            <TableHead><ColHead label="Ingrédient" provenance="EXTRAIT" /></TableHead>
            <TableHead className="text-right"><ColHead label="Qté (kg)" provenance="EXTRAIT" className="justify-end" /></TableHead>
            <TableHead className="text-right"><ColHead label="% brut" provenance="CALCULE" className="justify-end" /></TableHead>
            <TableHead className="text-right"><ColHead label="% étiquette" provenance="CALCULE" className="justify-end" /></TableHead>
            <TableHead className="text-center"><ColHead label="Demeter" provenance="EXTRAIT" className="justify-center" /></TableHead>
            <TableHead className="text-center"><ColHead label="Équitable" provenance="EXTRAIT" className="justify-center" /></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((ing) => (
            <TableRow
              key={ing.codeArticle}
              className="even:bg-stone-50/40 hover:bg-emerald-50/30 dark:even:bg-stone-800/30 dark:hover:bg-emerald-950/20"
            >
              <TableCell className="w-8 pr-0">
                <GripVertical
                  className={cn(
                    "size-4",
                    editable
                      ? "cursor-grab text-stone-400"
                      : "cursor-not-allowed text-stone-200 dark:text-stone-700"
                  )}
                  aria-hidden
                />
              </TableCell>
              <TableCell>
                <span className="font-medium text-stone-800 dark:text-stone-100">
                  {ing.designation}
                </span>
                <span className="ml-2 text-[10px] text-stone-400">
                  {ing.codeArticle}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-stone-600 dark:text-stone-300">
                {ing.quantiteKg}
              </TableCell>
              <TableCell className="text-right tabular-nums text-xs text-stone-400">
                {ing.pourcentageBrut.toFixed(3)}
              </TableCell>
              <TableCell className="text-right">
                <span className="text-base font-bold tabular-nums text-emerald-900 dark:text-emerald-100">
                  {ing.pourcentageEtiquette}
                </span>
                <span className="text-xs text-stone-400">%</span>
              </TableCell>
              <TableCell className="text-center">
                <Pastille on={ing.estDemeter} ton="emerald" />
              </TableCell>
              <TableCell className="text-center">
                <Pastille on={ing.estEquitable} ton="indigo" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

        <TableFooter className="sticky bottom-0 bg-stone-50/95 backdrop-blur-sm dark:bg-stone-900/95">
          <TableRow className="hover:bg-transparent">
            <TableCell />
            <TableCell className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
              Total
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums text-stone-700 dark:text-stone-200">
              {data.totalKg}
            </TableCell>
            <TableCell />
            <TableCell className="text-right">
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 text-[10px] font-bold tabular-nums",
                  conforme
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                )}
              >
                {conforme
                  ? "100 % ✓"
                  : `${total} % ⚠ (${ecart > 0 ? "+" : ""}${ecart})`}
              </Badge>
            </TableCell>
            <TableCell />
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

export default RecetteTable;
