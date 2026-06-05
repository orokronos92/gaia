"use client";

import { FlaskConical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRecette } from "@/hooks/useRecette";
import { DemeterBanner } from "./DemeterBanner";
import { RecetteTable } from "./RecetteTable";
import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent";

export interface RecettePanelProps {
  ficheId: string;
  recette: RecetteAgentOutput | null;
}

export function RecettePanel({ ficheId, recette }: RecettePanelProps) {
  const { data, etat, calculer } = useRecette(ficheId, recette);

  if (etat === "chargement") {
    return (
      <div className="space-y-2 rounded-2xl border border-stone-100 bg-white/70 p-4 dark:border-stone-800 dark:bg-stone-900/40">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800/60"
          />
        ))}
      </div>
    );
  }

  if (etat === "vide" || !data) {
    return (
      <div className="flex animate-in fade-in slide-in-from-bottom-4 flex-col items-center justify-center rounded-3xl border border-dashed border-stone-200 bg-white/50 px-6 py-16 text-center duration-500 dark:border-stone-700 dark:bg-stone-900/30">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
          <FlaskConical className="size-7" aria-hidden />
        </div>
        <h3 className="text-lg font-light tracking-tight text-emerald-950 dark:text-emerald-50">
          Aucune recette calculée
        </h3>
        <p className="mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">
          La recette QUID (pourcentages, conformité Demeter) sera calculée
          automatiquement à partir des quantités de la fiche.
        </p>
        <Button
          onClick={calculer}
          className="mt-5 rounded-xl bg-emerald-600 font-medium text-white shadow-sm shadow-emerald-700/20 hover:bg-emerald-700"
        >
          <FlaskConical className="mr-2 size-4" /> Calculer la recette
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 duration-500">
      <DemeterBanner demeter={data.demeter} />
      <RecetteTable data={data} editable={false} />
    </div>
  );
}

export default RecettePanel;
