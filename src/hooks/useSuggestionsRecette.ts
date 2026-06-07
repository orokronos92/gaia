"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { suggererQuantitesAction } from "@/app/actions/recette";
import { masseLotDe } from "@/lib/recette/conversion";
import type { EtatCalculatrice, SuggestionLigne } from "@/lib/recette/types";

/** Is a line missing its quantity in the active unit? */
function ligneIncomplete(
  l: EtatCalculatrice["lignes"][number],
  mode: EtatCalculatrice["unitMode"]
): boolean {
  return mode === "kg" ? l.quantiteKg == null : l.pourcentageSaisi == null;
}

export interface UseSuggestionsResult {
  parLigne: Record<string, SuggestionLigne>;
  loadingIds: string[];
  globalLoading: boolean;
  demander: (etat: EtatCalculatrice, ids?: string[]) => Promise<void>;
  retirer: (id: string) => void;
}

/**
 * Owns the non-binding AI suggestions for missing quantities (SPEC-03b §6).
 * Kept out of the calculator so the suggestion flow stays isolated and the
 * deterministic core never depends on it.
 */
export function useSuggestionsRecette(produitId: string): UseSuggestionsResult {
  const [parLigne, setParLigne] = useState<Record<string, SuggestionLigne>>({});
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);

  const demander = useCallback(
    async (etat: EtatCalculatrice, ids?: string[]) => {
      const cibles = etat.lignes.filter(
        (l) =>
          (ids ? ids.includes(l.id) : true) &&
          ligneIncomplete(l, etat.unitMode) &&
          l.designation.trim() !== ""
      );
      if (cibles.length === 0) {
        toast.info("Aucune ligne à compléter (désignation requise).");
        return;
      }

      const cible = ids && ids.length === 1 ? ids[0] : null;
      if (cible) setLoadingIds((p) => [...p, cible]);
      else setGlobalLoading(true);

      try {
        const res = await suggererQuantitesAction({
          produitId,
          contexte: etat.lignes
            .map((l) => l.designation)
            .filter(Boolean)
            .join(", "),
          masseLotKg: masseLotDe(etat),
          connus: etat.lignes
            .filter((l) => l.designation.trim() !== "")
            .map((l) => ({
              designation: l.designation,
              pourcentage: l.pourcentageSaisi,
              quantiteKg: l.quantiteKg,
            })),
          manquants: cibles.map((c) => c.designation),
        });

        const map: Record<string, SuggestionLigne> = {};
        for (const s of res.suggestions) {
          const ligne = cibles.find(
            (c) => c.designation.toLowerCase() === s.designation.toLowerCase()
          );
          if (ligne) {
            map[ligne.id] = {
              quantiteKg: s.quantiteKg,
              confiance: s.confiance,
            };
          }
        }
        setParLigne((p) => ({ ...p, ...map }));

        if (Object.keys(map).length === 0) {
          toast.warning("Aucune suggestion exploitable.", {
            description: res.note,
          });
        } else {
          toast.success("Suggestions IA proposées — à valider.", {
            description: res.note,
          });
        }
      } catch (e) {
        toast.error("Suggestion IA indisponible.", {
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        if (cible) setLoadingIds((p) => p.filter((x) => x !== cible));
        else setGlobalLoading(false);
      }
    },
    [produitId]
  );

  const retirer = useCallback(
    (id: string) =>
      setParLigne((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      }),
    []
  );

  return { parLigne, loadingIds, globalLoading, demander, retirer };
}
