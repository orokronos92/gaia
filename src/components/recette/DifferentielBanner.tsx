"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, Plus, Minus, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EcartComposition, TypeEcart } from "@/lib/recette/differentiel";

const META: Record<TypeEcart, { icon: typeof Plus; libelle: string; tone: string }> = {
  ajoute: { icon: Plus, libelle: "absent de la fiche produit", tone: "text-emerald-600" },
  retire: { icon: Minus, libelle: "absent de la recette", tone: "text-red-500" },
  pourcentage: { icon: Percent, libelle: "% différent", tone: "text-amber-600" },
};

function detailPct(e: EcartComposition): string {
  if (e.type === "pourcentage") return ` (produit ${e.pctProduit} % → recette ${e.pctRecette} %)`;
  if (e.type === "ajoute" && e.pctRecette != null) return ` (${e.pctRecette} %)`;
  if (e.type === "retire" && e.pctProduit != null) return ` (${e.pctProduit} %)`;
  return "";
}

interface DifferentielBannerProps {
  ecarts: EcartComposition[];
}

/**
 * Signal + detail-on-click of the composition differential vs the fiche produit.
 * Marie always sees the gap; she resolves it on the recette and validates.
 */
export function DifferentielBanner({ ecarts }: DifferentielBannerProps) {
  const [open, setOpen] = useState(false);
  if (ecarts.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-amber-800 dark:text-amber-200"
      >
        <AlertTriangle className="size-4 shrink-0" />
        {ecarts.length} écart(s) de composition avec la fiche produit
        <ChevronDown className={cn("ml-auto size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="space-y-1.5 border-t border-amber-200/70 px-4 py-3 dark:border-amber-900">
          {ecarts.map((e, i) => {
            const m = META[e.type];
            const Icon = m.icon;
            return (
              <li key={`${e.designation}-${i}`} className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-100">
                <Icon className={cn("mt-0.5 size-3.5 shrink-0", m.tone)} />
                <span>
                  <span className="font-semibold">{e.designation}</span> — {m.libelle}
                  {detailPct(e)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
