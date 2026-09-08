"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { appliquerListeRecetteAction } from "@/app/actions/recette";
import type { EcartComposition } from "@/lib/recette/differentiel";

export interface PropositionListe {
  avant: string;
  apres: string;
  ecarts: EcartComposition[];
}

interface ListeDeclareeDiffProps {
  ficheId: string;
  produitId: string;
  proposition: PropositionListe;
  onClos: () => void;
}

/**
 * La recette veut réécrire la liste déclarée, et elle ne dit pas la même chose.
 *
 * La réécriture reste le comportement normal — la recette est la référence — mais
 * elle ne s'exécute plus en silence quand elle change les **dénominations** :
 * la recette porte des désignations fournisseur là où l'étiquette imprime des
 * dénominations légales, et cette liste-là est celle que l'audit oppose au BAT.
 *
 * On ne pose pas une question, on montre les deux textes : Marie tranche sur
 * pièces. Un écart de pourcentage ne passe jamais par ici — c'est l'arrondi, et
 * il n'appelle aucune décision.
 */
export function ListeDeclareeDiff({ ficheId, produitId, proposition, onClos }: ListeDeclareeDiffProps) {
  const [pending, start] = useTransition();
  const [fait, setFait] = useState(false);
  if (fait) return null;

  const appliquer = () =>
    start(async () => {
      const r = await appliquerListeRecetteAction({ ficheId, produitId });
      if (r.ok) {
        toast.success("Liste déclarée remplacée par celle de la recette.");
        setFait(true);
        onClos();
      } else {
        toast.error(r.error ?? "Échec du report.");
      }
    });

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-100">
        <AlertTriangle className="size-4 shrink-0" />
        La recette ne nomme pas les mêmes matières que la liste déclarée
      </div>
      <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
        {proposition.ecarts.length} dénomination(s) d&apos;écart. La liste déclarée est celle que
        l&apos;audit compare au BAT — elle n&apos;a pas été touchée.
      </p>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <Bloc titre="Liste déclarée actuelle" texte={proposition.avant} ton="border-stone-200 bg-white" />
        <Bloc titre="Ce que la recette propose" texte={proposition.apres} ton="border-amber-200 bg-amber-100/40" />
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {proposition.ecarts.map((e, i) => (
          <li key={`${e.designation}-${i}`} className="text-[11px] font-medium text-amber-900/80 dark:text-amber-200/80">
            {e.type === "ajoute" ? "+" : "−"} {e.designation}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={appliquer}
          disabled={pending}
          className="gap-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700"
        >
          <ArrowRight className="size-3.5" />
          Remplacer par la liste de la recette
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setFait(true);
            onClos();
          }}
          disabled={pending}
          className="gap-1.5 rounded-xl"
        >
          <X className="size-3.5" />
          Garder la liste déclarée
        </Button>
      </div>
    </div>
  );
}

function Bloc({ titre, texte, ton }: { titre: string; texte: string; ton: string }) {
  return (
    <div className={`rounded-xl border p-3 ${ton}`}>
      <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-stone-500">
        <Check className="size-3" /> {titre}
      </div>
      <p className="text-xs leading-relaxed text-stone-700">{texte || "—"}</p>
    </div>
  );
}

export default ListeDeclareeDiff;
