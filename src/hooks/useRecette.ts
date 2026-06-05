"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent";

export type EtatRecette = "vide" | "chargement" | "presente";

export interface UseRecetteResult {
  data: RecetteAgentOutput | null;
  etat: EtatRecette;
  isCalculating: boolean;
  calculer: () => void;
}

/**
 * Centralises recipe state for a fiche (SPEC-03 §7). Reads are SSR-seeded — the
 * recipe is fetched in the Server Component and passed in, so there is no
 * client-side DB fetch (CLAUDE.md). Mutation (compute / edit → VALIDE) will be
 * wired here later; `calculer` is a stub today because no structured ingredient
 * (kg) source exists yet — flagged as the SPEC-02/03 data gap.
 */
export function useRecette(
  _ficheId: string,
  initial: RecetteAgentOutput | null
): UseRecetteResult {
  const [data] = useState<RecetteAgentOutput | null>(initial);
  const [isCalculating] = useState(false);

  const etat: EtatRecette = isCalculating
    ? "chargement"
    : data
      ? "presente"
      : "vide";

  const calculer = useCallback(() => {
    toast.info("Saisie des ingrédients à venir", {
      description:
        "Le calcul automatique de la recette nécessite la saisie des quantités (kg), bientôt disponible.",
    });
  }, []);

  return { data, etat, isCalculating, calculer };
}
