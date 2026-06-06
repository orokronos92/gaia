import { RecetteCalculator } from "./RecetteCalculator";
import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent";

export interface RecettePanelProps {
  ficheId: string;
  produitId: string;
  recette: RecetteAgentOutput | null;
}

/**
 * Recette/QUID tab (SPEC-03b). The former read-only table is replaced by the
 * editable ingredient calculator; figures still come from `computeRecette`
 * (SPEC-02), now driven live by Marie's kg/% input. `produitId`/`ficheId` feed
 * the validation/persistence step (SPEC-03b §7).
 */
export function RecettePanel({ recette, produitId, ficheId }: RecettePanelProps) {
  return (
    <RecetteCalculator recette={recette} produitId={produitId} ficheId={ficheId} />
  );
}

export default RecettePanel;
