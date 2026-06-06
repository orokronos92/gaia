"use client";

import { useEffect, useState } from "react";
import { GripVertical, X, AlertTriangle, Sparkles, Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Pastille,
  CodeArticleText,
  PctBrutText,
} from "@/components/recette/recette-cells";
import type { UseCalculatriceResult } from "@/hooks/useCalculatrice";
import type { LigneIngredient, SuggestionLigne } from "@/lib/recette/types";
import type { RecetteCalculee } from "@/lib/business-rules/recette";

/** Smooth-typing numeric cell: keeps the raw draft while focused. */
export function CelluleNombre({
  value,
  onCommit,
  placeholder,
  alerte,
  unite,
  className,
}: {
  value: number | null;
  onCommit: (raw: string) => void;
  placeholder?: string;
  alerte?: boolean;
  unite?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setDraft(value == null ? "" : String(value));
  }, [value, focus]);

  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        value={draft}
        placeholder={placeholder}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onChange={(e) => {
          setDraft(e.target.value);
          onCommit(e.target.value);
        }}
        className={cn(
          "h-9 w-24 text-right tabular-nums",
          unite && "pr-7",
          alerte &&
            "border-amber-300 bg-amber-50/70 placeholder:text-amber-500 focus-visible:ring-amber-300 dark:border-amber-700 dark:bg-amber-950/30",
          className
        )}
      />
      {unite && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-stone-400">
          {unite}
        </span>
      )}
    </div>
  );
}

export interface RecetteCalculatorRowProps {
  ligne: LigneIngredient;
  sortie: RecetteCalculee["ingredients"][number] | null;
  saisieUnite: string;
  equivUnite: string;
  c: UseCalculatriceResult;
  suggestion?: SuggestionLigne | null;
  suggLoading?: boolean;
  onSuggerer?: () => void;
  onAccepterSuggestion?: () => void;
  onIgnorerSuggestion?: () => void;
}

export function RecetteCalculatorRow({
  ligne,
  sortie,
  saisieUnite,
  equivUnite,
  c,
  suggestion,
  suggLoading,
  onSuggerer,
  onAccepterSuggestion,
  onIgnorerSuggestion,
}: RecetteCalculatorRowProps) {
  const unitMode = c.etat.unitMode;
  const saisieVal = unitMode === "kg" ? ligne.quantiteKg : ligne.pourcentageSaisi;
  const eq = c.equivalent(ligne);
  const incomplete =
    unitMode === "kg" ? ligne.quantiteKg == null : ligne.pourcentageSaisi == null;
  const etiquetteVal = ligne.overrideEtiquette ?? sortie?.pourcentageEtiquette ?? null;

  return (
    <TableRow
      className={cn(
        "even:bg-stone-50/40 hover:bg-emerald-50/30 dark:even:bg-stone-800/30",
        incomplete && "bg-amber-50/40 hover:bg-amber-50/60 dark:bg-amber-950/10"
      )}
    >
      <TableCell className="w-8 pr-0">
        <GripVertical
          className={cn(
            "size-4",
            c.peutCalculer
              ? "cursor-grab text-stone-400"
              : "cursor-not-allowed text-stone-200 dark:text-stone-700"
          )}
          aria-hidden
        />
      </TableCell>

      <TableCell>
        <div className="flex flex-col gap-0.5">
          <Input
            value={ligne.designation}
            placeholder="Désignation"
            onChange={(e) => c.setDesignation(ligne.id, e.target.value)}
            className="h-8 border-transparent bg-transparent px-1 font-medium text-stone-800 shadow-none hover:border-stone-200 focus-visible:border-stone-300 dark:text-stone-100"
          />
          {ligne.provenance === "AJOUTE_MARIE" ? (
            <Input
              value={ligne.codeArticle ?? ""}
              placeholder="Code (optionnel)"
              onChange={(e) => c.setCodeArticle(ligne.id, e.target.value)}
              className="h-6 w-28 border-transparent bg-transparent px-1 text-[10px] text-stone-400 shadow-none hover:border-stone-200 focus-visible:border-stone-300"
            />
          ) : (
            <span className="px-1">
              <CodeArticleText code={ligne.codeArticle} />
            </span>
          )}
        </div>
      </TableCell>

      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center justify-end gap-1.5">
            {incomplete && (
              <span title="Quantité absente de la fiche dégustation — à renseigner">
                <AlertTriangle className="size-3.5 text-amber-500" aria-hidden />
              </span>
            )}
            <CelluleNombre
              value={saisieVal}
              onCommit={(raw) => c.setSaisie(ligne.id, raw)}
              placeholder={incomplete ? "à compléter" : ""}
              alerte={incomplete}
              unite={saisieUnite}
            />
            {incomplete && !suggestion && onSuggerer && (
              <button
                type="button"
                onClick={onSuggerer}
                disabled={suggLoading}
                title="Suggérer une quantité (IA)"
                aria-label="Suggérer une quantité (IA)"
                className="text-amber-500 transition-colors hover:text-amber-700 disabled:opacity-50"
              >
                {suggLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
              </button>
            )}
          </div>

          {suggestion && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-2 py-0.5 dark:border-amber-800 dark:bg-amber-950/30">
              <Sparkles className="size-3 text-amber-500" aria-hidden />
              <span className="text-[11px] italic tabular-nums text-amber-700 dark:text-amber-300">
                ≈ {Math.round(suggestion.quantiteKg * 1000) / 1000} kg · IA (
                {suggestion.confiance.toLowerCase()})
              </span>
              <button
                type="button"
                onClick={onAccepterSuggestion}
                title="Accepter la suggestion"
                aria-label="Accepter la suggestion"
                className="text-emerald-600 hover:text-emerald-800"
              >
                <Check className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onIgnorerSuggestion}
                title="Ignorer la suggestion"
                aria-label="Ignorer la suggestion"
                className="text-stone-400 hover:text-red-500"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </TableCell>

      <TableCell className="text-right tabular-nums text-stone-500 transition-all dark:text-stone-400">
        {eq == null ? "—" : `${eq.toFixed(eq < 10 ? 3 : 2)} ${equivUnite}`}
      </TableCell>

      <TableCell className="text-right">
        <PctBrutText value={sortie?.pourcentageBrut ?? null} />
      </TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {ligne.overrideEtiquette != null && (
            <span
              title="Valeur forcée par Marie (l'algorithme ne la réécrase pas)"
              className="size-1.5 rounded-full bg-amber-500"
              aria-hidden
            />
          )}
          <CelluleNombre
            value={etiquetteVal}
            onCommit={(raw) => c.setOverride(ligne.id, raw)}
            unite="%"
            className="w-20 font-bold text-emerald-900 dark:text-emerald-100"
          />
        </div>
      </TableCell>

      <TableCell className="text-center">
        <button
          type="button"
          onClick={() => c.toggleDemeter(ligne.id)}
          aria-label="Basculer Demeter"
        >
          <Pastille on={ligne.estDemeter} ton="emerald" />
        </button>
      </TableCell>

      <TableCell className="text-center">
        <button
          type="button"
          onClick={() => c.toggleEquitable(ligne.id)}
          aria-label="Basculer équitable"
        >
          <Pastille on={ligne.estEquitable} ton="indigo" />
        </button>
      </TableCell>

      <TableCell className="w-8 pl-0">
        <button
          type="button"
          onClick={() => c.supprimerLigne(ligne.id)}
          aria-label="Supprimer la ligne"
          className="text-stone-300 transition-colors hover:text-red-500"
        >
          <X className="size-4" />
        </button>
      </TableCell>
    </TableRow>
  );
}

export default RecetteCalculatorRow;
