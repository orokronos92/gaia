import { FlaskConical, Tag, EyeOff } from "lucide-react";

import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent";
import { genererListeIngredients } from "@/lib/recette/liste-ingredients";

export interface RecetteListeCardsProps {
  recette: RecetteAgentOutput | null;
}

/**
 * Two read-only ingredient lists derived from the validated recette (lot 5 of
 * the dual recipe view). Both come from `recette` — the single source of truth,
 * edited only in the Recette / QUID tab:
 *   - "Recette complète": every ingredient with its real %.
 *   - "Recette de l'étiquette": Marie's masked ingredients print without their %
 *     (industrial secret). This is what actually goes on the label.
 * No inline editing here on purpose — changes flow from QUID after validation.
 */
export function RecetteListeCards({ recette }: RecetteListeCardsProps) {
  if (!recette || recette.ingredients.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/80 py-10 text-center text-sm font-medium text-stone-400">
        Aucune recette validée. Renseignez-la dans l&apos;onglet Recette / QUID.
      </div>
    );
  }

  const complete = genererListeIngredients(recette.ingredients);
  const masques = recette.ingredients.map((i) => i.masquerEtiquette);
  const etiquette = genererListeIngredients(recette.ingredients, undefined, masques);
  const nbMasques = masques.filter(Boolean).length;

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
          <FlaskConical className="size-3.5" /> Recette complète
        </div>
        <p className="text-sm font-medium leading-relaxed text-stone-600">{complete}</p>
      </div>

      <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4 shadow-sm">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            <Tag className="size-3.5" /> Recette de l&apos;étiquette
          </div>
          {nbMasques > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
              <EyeOff className="size-3" /> {nbMasques} % masqué{nbMasques > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p className="text-sm font-medium leading-relaxed text-emerald-900">{etiquette}</p>
      </div>
    </div>
  );
}

export default RecetteListeCards;
