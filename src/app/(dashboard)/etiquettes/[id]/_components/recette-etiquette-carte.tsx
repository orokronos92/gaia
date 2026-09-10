"use client";

import { useState, useTransition } from "react";
import { Tag, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { renommerIngredientEtiquetteAction } from "@/app/actions/recette";
import { genererListeIngredients } from "@/lib/recette/liste-ingredients";
import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent";

/**
 * La recette étiquette — le brouillon d'étiquette, et la seule référence de
 * l'audit (décision 2026-09-10).
 *
 * Elle reprend la recette de production ligne à ligne : mêmes ingrédients,
 * mêmes pourcentages arrondis, mêmes marqueurs. **Seul le nom est éditable**,
 * parce que c'est la seule chose que la Qualité ait à décider ici. La recette
 * dit « SORWATHE OP1 » — le nom qui désigne le lot à peser — et l'étiquette doit
 * dire « thé noir », la dénomination légale. Les deux sont justes, et aucun ne
 * peut remplacer l'autre.
 *
 * Un champ de texte libre aurait été plus simple à écrire et aurait tout reperdu
 * : les pourcentages redeviendraient de la saisie, les étoiles aussi, et plus
 * rien ne serait vérifiable ligne par ligne.
 */

export interface RecetteEtiquetteCarteProps {
  ficheId: string;
  recette: RecetteAgentOutput;
}

export function RecetteEtiquetteCarte({ ficheId, recette }: RecetteEtiquetteCarteProps) {
  const ings = [...recette.ingredients].sort((a, b) => a.ordreTri - b.ordreTri);

  // Aucun état local ici : l'action revalide la page, les props reviennent à
  // jour, et chaque ligne garde son propre brouillon le temps de la frappe.
  const nomImprime = (i: (typeof ings)[number]) => i.designationEtiquette ?? i.designation;
  const aRelire = ings.filter((i) => !nomRelu(i.designation, nomImprime(i))).length;

  const texte = genererListeIngredients(
    ings.map((i) => ({
      designation: nomImprime(i),
      pourcentageEtiquette: i.pourcentageEtiquette,
      ordreTri: i.ordreTri,
      estDemeter: i.estDemeter,
      estEquitable: i.estEquitable,
    })),
    undefined,
    ings.map((i) => i.masquerEtiquette)
  );

  return (
    <div className="rounded-2xl border border-sky-200/60 bg-sky-50/40 p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-700">
          <Tag className="size-3.5" /> Recette étiquette
          <span className="font-semibold normal-case tracking-normal text-stone-400">
            · ce qui sera imprimé, comparé au BAT
          </span>
        </div>
        {aRelire > 0 && (
          <span className="text-[10px] font-semibold text-amber-600">
            {aRelire} nom{aRelire > 1 ? "s" : ""} encore au nom de la recette
          </span>
        )}
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
            <th className="pb-1 text-left font-bold">Nom imprimé</th>
            <th className="pb-1 pr-2 text-left font-bold">Nom recette</th>
            <th className="pb-1 text-right font-bold">%</th>
          </tr>
        </thead>
        <tbody>
          {ings.map((i) => (
            <LigneEtiquette
              key={i.id ?? `${i.codeArticle}-${i.ordreTri}`}
              ficheId={ficheId}
              ingredientId={i.id}
              designationRd={i.designation}
              valeur={nomImprime(i)}
              estDemeter={i.estDemeter}
              masque={i.masquerEtiquette}
              pourcentage={i.pourcentageEtiquette}
            />
          ))}
        </tbody>
      </table>

      <ListeGeneree texte={texte} />
    </div>
  );
}

/** Le nom imprimé a-t-il été relu, ou est-ce encore celui de la recette ? */
function nomRelu(designationRd: string, nomImprime: string): boolean {
  return nomImprime.trim().toLowerCase() !== designationRd.trim().toLowerCase();
}

function LigneEtiquette({
  ficheId,
  ingredientId,
  designationRd,
  valeur,
  estDemeter,
  masque,
  pourcentage,
}: {
  ficheId: string;
  ingredientId?: string;
  designationRd: string;
  valeur: string;
  estDemeter: boolean;
  masque: boolean;
  pourcentage: number;
}) {
  const [pending, start] = useTransition();
  const [brouillon, setBrouillon] = useState(valeur);
  // Le serveur a renvoyé une autre valeur (enregistrement, rechargement) : on
  // réaligne le brouillon pendant le rendu — un effet ferait un aller-retour
  // d'affichage pour rien, et React le déconseille pour ce cas précis.
  const [valeurConnue, setValeurConnue] = useState(valeur);
  if (valeur !== valeurConnue) {
    setValeurConnue(valeur);
    setBrouillon(valeur);
  }

  const identique = brouillon.trim().toLowerCase() === designationRd.trim().toLowerCase();

  const enregistrer = () => {
    const nom = brouillon.trim();
    if (nom === valeur.trim() || !ingredientId) return;
    start(async () => {
      const r = await renommerIngredientEtiquetteAction({
        ficheId,
        ingredientId,
        designationEtiquette: nom,
      });
      if (r.ok) {
        toast.success("Dénomination d'étiquette enregistrée");
      } else {
        setBrouillon(valeur);
        toast.error("Échec de l'enregistrement", { description: r.error });
      }
    });
  };

  return (
    <tr className="border-b border-sky-100 last:border-0">
      <td className="py-1 pr-2">
        <div className="flex items-center gap-1">
          <input
            value={brouillon}
            onChange={(e) => setBrouillon(e.target.value)}
            onBlur={enregistrer}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setBrouillon(valeur);
            }}
            disabled={pending || !ingredientId}
            aria-label={`Dénomination imprimée de ${designationRd}`}
            className={cn(
              "w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 font-medium text-sky-900",
              "hover:border-sky-200 focus:border-sky-400 focus:bg-white focus:outline-none",
              identique && "text-amber-800"
            )}
          />
          {estDemeter && <span className="shrink-0 text-[10px] font-bold text-emerald-700">✱✱</span>}
          {pending && <Loader2 className="size-3 shrink-0 animate-spin text-sky-500" />}
        </div>
      </td>
      <td className="py-1 pr-2 text-stone-400">{designationRd}</td>
      <td className="py-1 text-right tabular-nums font-semibold text-sky-800">
        {masque ? "—" : `${pourcentage} %`}
      </td>
    </tr>
  );
}

/** Le texte tel qu'il partira à la comparaison avec le BAT. */
function ListeGeneree({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <div className="mt-3 rounded-xl border border-sky-200/70 bg-white/70 p-2.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
          Liste telle qu&apos;imprimée
        </span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(texte);
              setCopie(true);
              setTimeout(() => setCopie(false), 1800);
            } catch {
              setCopie(false);
            }
          }}
          className="flex items-center gap-1 text-[10px] font-semibold text-sky-700 hover:text-sky-900"
        >
          {copie ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copie ? "Copié" : "Copier"}
        </button>
      </div>
      <p className="text-sm font-medium leading-relaxed text-sky-900">{texte}</p>
    </div>
  );
}

export default RecetteEtiquetteCarte;
