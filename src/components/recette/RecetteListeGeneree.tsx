"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RecetteCalculee } from "@/lib/business-rules/recette";

export interface RecetteListeGenereeProps {
  resultat: RecetteCalculee;
  /** Effective label % per ingredient (overrides applied), aligned with resultat. */
  etiquettes: number[];
}

/**
 * Deterministic, read-only ingredient list (SPEC-03b §5.5) — the mirror of what
 * Marie wrote by hand. Built from the computed result (no LLM): ordered by
 * descending %, each line "designation P %", with markers for Demeter / fair
 * trade. Copy-to-clipboard for pasting into the label.
 */
export function RecetteListeGeneree({
  resultat,
  etiquettes,
}: RecetteListeGenereeProps) {
  const [copie, setCopie] = useState(false);

  const lignes = resultat.ingredients
    .map((ing, i) => ({ ing, pct: etiquettes[i] ?? ing.pourcentageEtiquette }))
    .sort((a, b) => a.ing.ordreTri - b.ing.ordreTri)
    .map(({ ing, pct }) => {
      const marqueurs = [
        ing.estDemeter ? "✱" : "",
        ing.estEquitable ? "°" : "",
      ].join("");
      return `${ing.designation}${marqueurs} ${pct} %`;
    });

  const texte = lignes.join(", ") + ".";

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      setTimeout(() => setCopie(false), 1800);
    } catch {
      setCopie(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200/60 bg-white/70 p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
          Liste d&apos;ingrédients (générée)
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copier}
          className="h-7 gap-1.5 rounded-lg text-xs"
        >
          {copie ? (
            <>
              <Check className="size-3.5 text-emerald-600" /> Copié
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Copier
            </>
          )}
        </Button>
      </div>
      <p className="font-mono text-sm leading-relaxed text-stone-700 dark:text-stone-200">
        {texte}
      </p>
      <p className="mt-2 text-[10px] italic text-stone-400">
        ✱ Demeter · ° commerce équitable — liste déterministe, à valider par la Qualité.
      </p>
    </div>
  );
}

export default RecetteListeGeneree;
