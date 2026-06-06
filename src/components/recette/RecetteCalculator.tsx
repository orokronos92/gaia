"use client";

import { useMemo, useState } from "react";
import { Info, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecetteCalculatorToolbar } from "@/components/recette/RecetteCalculatorToolbar";
import { RecetteCalculatorRow } from "@/components/recette/RecetteCalculatorRow";
import { RecetteValidation } from "@/components/recette/RecetteValidation";
import { DemeterBanner } from "@/components/recette/DemeterBanner";
import { useCalculatrice, etatDepuisRecette } from "@/hooks/useCalculatrice";
import { useSuggestionsRecette } from "@/hooks/useSuggestionsRecette";
import { kgVersPct, normaliserVersKg } from "@/lib/recette/conversion";
import { validerRecetteAction } from "@/app/actions/recette";
import type { EtatCalculatrice } from "@/lib/recette/types";
import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent";

export interface RecetteCalculatorProps {
  /** Pre-fill from a persisted recette (SPEC-02/03); empty when none yet. */
  recette: RecetteAgentOutput | null;
  produitId: string;
  ficheId: string;
}

export function RecetteCalculator({
  recette,
  produitId,
  ficheId,
}: RecetteCalculatorProps) {
  const initial: EtatCalculatrice = useMemo(
    () => etatDepuisRecette(recette),
    [recette]
  );
  const c = useCalculatrice(initial);
  const sugg = useSuggestionsRecette(produitId);
  const [validating, setValidating] = useState(false);
  const { etat, resultat } = c;

  const saisieUnite = etat.unitMode === "kg" ? "kg" : "%";
  const equivUnite = etat.unitMode === "kg" ? "%" : "kg";
  const totalKg = etat.lignes.reduce((s, l) => s + (l.quantiteKg ?? 0), 0);

  const etiquettes = resultat
    ? etat.lignes.map(
        (l, i) =>
          l.overrideEtiquette ?? resultat.ingredients[i]?.pourcentageEtiquette ?? 0
      )
    : [];

  const accepterSuggestion = (ligneId: string) => {
    const s = sugg.parLigne[ligneId];
    if (!s) return;
    if (etat.unitMode === "pct") {
      if (etat.masseLotKg && etat.masseLotKg > 0) {
        c.setSaisie(ligneId, String(kgVersPct(s.quantiteKg, etat.masseLotKg)));
      } else {
        toast.info("Renseignez la masse de lot pour appliquer la suggestion en %.");
        return;
      }
    } else {
      c.setSaisie(ligneId, String(s.quantiteKg));
    }
    sugg.retirer(ligneId);
  };

  const valider = async () => {
    if (!c.peutValider) return;
    setValidating(true);
    try {
      const ingredients = normaliserVersKg(etat).map((ing, i) => ({
        codeArticle: etat.lignes[i].codeArticle,
        designation: ing.designation,
        quantiteKg: ing.quantiteKg,
        estDemeter: ing.estDemeter,
        estEquitable: ing.estEquitable,
        overrideEtiquette: etat.lignes[i].overrideEtiquette,
      }));
      await validerRecetteAction({ produitId, ficheId, pas: etat.pas, ingredients });
      toast.success("Recette validée et enregistrée.");
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
        unitMode={etat.unitMode}
        pas={etat.pas}
        masseLotKg={etat.masseLotKg}
        masseRequise={c.masseRequise}
        onUnitMode={c.setUnitMode}
        onPas={c.setPas}
        onMasse={c.setMasseLot}
        onAjouter={c.ajouterLigne}
      />

      {c.masseRequise && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <Info className="size-4 shrink-0" />
          Renseigner la masse de lot pour obtenir les grammages.
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
                <ColLabel label={`Saisie (${saisieUnite})`} accent />
              </TableHead>
              <TableHead className="text-right">
                <ColLabel label={`Équiv. (${equivUnite})`} />
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
                saisieUnite={saisieUnite}
                equivUnite={equivUnite}
                c={c}
                suggestion={sugg.parLigne[ligne.id] ?? null}
                suggLoading={sugg.loadingIds.includes(ligne.id)}
                onSuggerer={() => sugg.demander(etat, [ligne.id])}
                onAccepterSuggestion={() => accepterSuggestion(ligne.id)}
                onIgnorerSuggestion={() => sugg.retirer(ligne.id)}
              />
            ))}
          </TableBody>

          <TableFooter className="sticky bottom-0 bg-stone-50/95 backdrop-blur-sm dark:bg-stone-900/95">
            <TableRow className="hover:bg-transparent">
              <TableCell />
              <TableCell className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                Total
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums text-stone-700 dark:text-stone-200">
                {totalKg > 0 ? `${Math.round(totalKg * 1000) / 1000} kg` : "—"}
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell className="text-right" colSpan={4}>
                <TotalBadge nbIncomplets={c.nbIncomplets} total={c.totalEtiquette} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

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
}

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

function TotalBadge({
  nbIncomplets,
  total,
}: {
  nbIncomplets: number;
  total: number | null;
}) {
  if (nbIncomplets > 0) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-200 bg-amber-50 text-[10px] font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
      >
        {nbIncomplets} ingrédient{nbIncomplets > 1 ? "s" : ""} à compléter
      </Badge>
    );
  }
  if (total == null) return <span className="text-xs text-stone-400">—</span>;
  const conforme = Math.abs(total - 100) < 1e-6;
  const ecart = Math.round((total - 100) * 100) / 100;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px] font-bold tabular-nums",
        conforme
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      )}
    >
      {conforme ? "100 % ✓" : `${total} % ⚠ (${ecart > 0 ? "+" : ""}${ecart})`}
    </Badge>
  );
}

export default RecetteCalculator;
