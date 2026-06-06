"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RecetteListeGeneree } from "@/components/recette/RecetteListeGeneree";
import type { RecetteCalculee } from "@/lib/business-rules/recette";

export interface RecetteValidationProps {
  resultat: RecetteCalculee;
  /** Effective label % per ingredient (overrides applied), aligned with resultat. */
  etiquettes: number[];
  peutValider: boolean;
  conforme: boolean;
  totalEtiquette: number | null;
  validating: boolean;
  onValider: () => void;
}

/**
 * Bottom block of the calculator (SPEC-03b §5.5 + §7): the generated ingredient
 * list and the validation action. "Valider" is enabled only when the recipe is
 * complete and Σ = 100 — Marie is responsible for the write.
 */
export function RecetteValidation({
  resultat,
  etiquettes,
  peutValider,
  conforme,
  totalEtiquette,
  validating,
  onValider,
}: RecetteValidationProps) {
  return (
    <div className="space-y-4">
      <RecetteListeGeneree resultat={resultat} etiquettes={etiquettes} />

      <div className="flex flex-wrap items-center justify-end gap-3">
        {!conforme && totalEtiquette != null && (
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            Σ = {totalEtiquette} % — ajuster à 100 avant validation.
          </span>
        )}
        <Button
          type="button"
          onClick={onValider}
          disabled={!peutValider || validating}
          className={cn(
            "rounded-xl font-semibold text-white shadow-sm",
            "bg-emerald-600 shadow-emerald-700/20 hover:bg-emerald-700",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {validating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Validation…
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 size-4" /> Valider la recette
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default RecetteValidation;
