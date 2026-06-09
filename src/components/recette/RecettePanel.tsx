import { forwardRef } from "react";
import { RecetteCalculator, type RecetteCalculatorHandle } from "./RecetteCalculator";
import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent";

export interface RecettePanelProps {
  ficheId: string;
  produitId: string;
  recette: RecetteAgentOutput | null;
  ingredientsExtraits?: string | null;
}

/**
 * Recette/QUID tab (SPEC-03b). The former read-only table is replaced by the
 * editable ingredient calculator; figures still come from `computeRecette`
 * (SPEC-02), now driven live by Marie's kg/% input. `produitId`/`ficheId` feed
 * the validation/persistence step (SPEC-03b §7). The forwarded ref lets the
 * fiche save persist the recette too (coupling).
 */
export const RecettePanel = forwardRef<RecetteCalculatorHandle, RecettePanelProps>(
  function RecettePanel({ recette, produitId, ficheId, ingredientsExtraits }, ref) {
    return (
      <RecetteCalculator
        ref={ref}
        recette={recette}
        ingredientsExtraits={ingredientsExtraits}
        produitId={produitId}
        ficheId={ficheId}
      />
    );
  }
);

export default RecettePanel;
