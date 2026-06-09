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
    // The calculator seeds its editable state ONCE (useState) from `recette`. After a
    // re-import, router.refresh() brings fresh props but the seeded state would stick
    // until a tab switch remounts it. Keying on the recette's identity forces a remount
    // exactly when the data changes — so the tab updates in place, while in-progress
    // edits survive unrelated refreshes (same recette ⇒ same key ⇒ no remount).
    const cle = recette
      ? `r:${recette.totalKg}:${recette.ingredients
          .map((i) => `${i.codeArticle}|${i.quantiteKg}|${i.pourcentageEtiquette}`)
          .join(",")}`
      : `e:${ingredientsExtraits ?? ""}`;
    return (
      <RecetteCalculator
        key={cle}
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
