"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { Info, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RecetteCalculatorToolbar } from "@/components/recette/RecetteCalculatorToolbar";
import { RecetteCalculatorRow } from "@/components/recette/RecetteCalculatorRow";
import { RecetteTotaux } from "@/components/recette/RecetteTotaux";
import { RecetteValidation } from "@/components/recette/RecetteValidation";
import { DemeterBanner } from "@/components/recette/DemeterBanner";
import { useCalculatrice, etatInitial } from "@/hooks/useCalculatrice";
import { useSuggestionsRecette } from "@/hooks/useSuggestionsRecette";
import { kgVersPct, normaliserVersKg } from "@/lib/recette/conversion";
import { validerRecetteAction } from "@/app/actions/recette";
import type { EtatCalculatrice } from "@/lib/recette/types";
import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent";

// Marie reasons in %; the calculator gives her the grammages. Entry is always %.
const SAISIE_UNITE = "%";
const EQUIV_UNITE = "kg";

export interface RecetteCalculatorProps {
  /** Pre-fill from a persisted recette (SPEC-02/03). */
  recette: RecetteAgentOutput | null;
  /** Fallback pre-fill from extracted ingredient text when no recette exists. */
  ingredientsExtraits?: string | null;
  produitId: string;
  ficheId: string;
}

export interface RecetteCalculatorHandle {
  /** Persists the recette if complete; returns why not when it can't. Throws on a server error. */
  persister: () => Promise<{ saved: boolean; reason?: string }>;
}

export const RecetteCalculator = forwardRef<RecetteCalculatorHandle, RecetteCalculatorProps>(
  function RecetteCalculator(
    { recette, ingredientsExtraits, produitId, ficheId }: RecetteCalculatorProps,
    ref
  ) {
  const initial: EtatCalculatrice = useMemo(
    () => etatInitial(recette, ingredientsExtraits),
    [recette, ingredientsExtraits]
  );
  const c = useCalculatrice(initial);
  const sugg = useSuggestionsRecette(produitId);
  const [validating, setValidating] = useState(false);
  const { etat, resultat } = c;
  const masseLot = c.masseLot;

  const etiquettes = resultat
    ? etat.lignes.map(
        (l, i) =>
          l.overrideEtiquette ?? resultat.ingredients[i]?.pourcentageEtiquette ?? 0
      )
    : [];

  const accepterSuggestion = (ligneId: string) => {
    const s = sugg.parLigne[ligneId];
    if (!s) return;
    if (!masseLot || masseLot <= 0) {
      toast.info(
        "Renseignez la masse de l'ingrédient principal pour appliquer la suggestion."
      );
      return;
    }
    c.setSaisie(ligneId, String(kgVersPct(s.quantiteKg, masseLot)));
    sugg.retirer(ligneId);
  };

  // Shared persistence used by the recette's own button AND by the fiche save
  // (coupling). Returns a reason instead of toasting when the recette isn't
  // ready, so each caller can phrase it. Throws only on a server error.
  const persister = async (): Promise<{ saved: boolean; reason?: string }> => {
    if (!c.peutValider) {
      const reason =
        etat.lignes.length === 0
          ? "aucun ingrédient"
          : c.nbIncomplets > 0
            ? "lignes incomplètes"
            : "Σ ≠ 100 %";
      return { saved: false, reason };
    }
    const ingredients = normaliserVersKg(etat).map((ing, i) => ({
      codeArticle: etat.lignes[i].codeArticle,
      designation: ing.designation,
      quantiteKg: ing.quantiteKg,
      estDemeter: ing.estDemeter,
      estEquitable: ing.estEquitable,
      overrideEtiquette: etat.lignes[i].overrideEtiquette,
    }));
    await validerRecetteAction({ produitId, ficheId, pas: etat.pas, ingredients });
    return { saved: true };
  };

  useImperativeHandle(ref, () => ({ persister }));

  const valider = async () => {
    setValidating(true);
    try {
      const r = await persister();
      if (r.saved) toast.success("Recette validée et enregistrée.");
      else toast.info(`Recette non enregistrée : ${r.reason}.`);
    } catch (e) {
      toast.error("Échec de la validation.", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 duration-500">
      <RecetteCalculatorToolbar
        pas={etat.pas}
        massePrincipaleKg={etat.massePrincipaleKg}
        masseLot={masseLot}
        masseRequise={c.masseRequise}
        onPas={c.setPas}
        onMassePrincipale={c.setMassePrincipale}
        onAjouter={c.ajouterLigne}
      />

      {c.masseRequise && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <Info className="size-4 shrink-0" />
          Renseignez la masse de l&apos;ingrédient principal (kg) pour afficher les grammages — la recette reste enregistrable en % (masses relatives).
        </div>
      )}

      {c.nbIncomplets > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => sugg.demander(etat)}
            disabled={sugg.globalLoading}
            className="gap-1.5 rounded-xl text-xs text-amber-700 hover:text-amber-900"
          >
            {sugg.globalLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Suggérer les quantités manquantes (IA)
          </Button>
        </div>
      )}

      <ScrollArea className="w-full rounded-2xl border border-stone-100 bg-white/70 shadow-sm dark:border-stone-800 dark:bg-stone-900/40">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8" />
              <TableHead>
                <ColLabel label="Ingrédient" />
              </TableHead>
              <TableHead className="text-right">
                <ColLabel label={`Saisie (${SAISIE_UNITE})`} accent />
              </TableHead>
              <TableHead className="text-right">
                <ColLabel label={`Grammage (${EQUIV_UNITE})`} />
              </TableHead>
              <TableHead className="text-right">
                <ColLabel label="% brut" />
              </TableHead>
              <TableHead className="text-right">
                <ColLabel label="% étiquette" />
              </TableHead>
              <TableHead className="text-center">
                <ColLabel label="Demeter" />
              </TableHead>
              <TableHead className="text-center">
                <ColLabel label="Équitable" />
              </TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {etat.lignes.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={9}
                  className="py-10 text-center text-sm text-stone-400"
                >
                  Aucun ingrédient. Ajoutez une ligne ou renseignez la fiche.
                </TableCell>
              </TableRow>
            )}

            {etat.lignes.map((ligne, idx) => (
              <RecetteCalculatorRow
                key={ligne.id}
                ligne={ligne}
                sortie={resultat?.ingredients[idx] ?? null}
                saisieUnite={SAISIE_UNITE}
                equivUnite={EQUIV_UNITE}
                c={c}
                suggestion={sugg.parLigne[ligne.id] ?? null}
                suggLoading={sugg.loadingIds.includes(ligne.id)}
                onSuggerer={() => sugg.demander(etat, [ligne.id])}
                onAccepterSuggestion={() => accepterSuggestion(ligne.id)}
                onIgnorerSuggestion={() => sugg.retirer(ligne.id)}
              />
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {etat.lignes.length > 0 && (
        <RecetteTotaux
          total={c.totalControle}
          conforme={c.conforme}
          nbIncomplets={c.nbIncomplets}
          masseLot={masseLot}
        />
      )}

      {resultat && <DemeterBanner demeter={resultat.demeter} />}

      {resultat && (
        <RecetteValidation
          resultat={resultat}
          etiquettes={etiquettes}
          peutValider={c.peutValider}
          conforme={c.conforme}
          totalEtiquette={c.totalEtiquette}
          validating={validating}
          onValider={valider}
        />
      )}
    </div>
  );
});

function ColLabel({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-widest",
        accent ? "text-emerald-600" : "text-stone-400"
      )}
    >
      {label}
    </span>
  );
}

export default RecetteCalculator;
