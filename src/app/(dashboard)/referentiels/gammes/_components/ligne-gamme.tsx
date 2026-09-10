"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, EyeOff, Loader2, Plus, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  basculerActiviteAction,
  creerSousGammeAction,
  renommerGammeAction,
  renommerSousGammeAction,
} from "@/app/actions/gammes";
import type { GammeReferentiel } from "@/db/queries/gammes";

/**
 * Une gamme, ses sous-gammes, et ce que le catalogue en fait.
 *
 * Le nombre de produits est affiché sur chaque ligne parce que c'est lui qui
 * rend les accidents visibles : une gamme à un produit posée à côté d'une à 89
 * se comprend sans explication.
 */
export function LigneGamme({ gamme, douteuse }: { gamme: GammeReferentiel; douteuse: boolean }) {
  const [ajout, setAjout] = useState("");
  const [pending, start] = useTransition();

  const agir = (action: () => Promise<{ ok: boolean; error?: string }>, succes: string) =>
    start(async () => {
      const r = await action();
      if (r.ok) toast.success(succes);
      else toast.error("Échec", { description: r.error });
    });

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white/70 p-5 shadow-sm backdrop-blur-xl",
        gamme.active ? "border-stone-200/70" : "border-stone-200/50 bg-stone-50/60 opacity-70",
        douteuse && "border-amber-300"
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <NomEditable
          valeur={gamme.nom}
          aria="Nom de la gamme"
          gras
          onEnregistrer={(nom) =>
            agir(() => renommerGammeAction({ id: gamme.id, nom }), "Gamme renommée")
          }
        />
        <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
          {gamme.nbProduits} produit{gamme.nbProduits > 1 ? "s" : ""}
        </span>
        {douteuse && (
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" /> doublon probable
          </span>
        )}
        {!gamme.active && (
          <span className="shrink-0 text-[11px] font-semibold text-stone-500">retirée des choix</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            agir(
              () => basculerActiviteAction({ table: "gamme", id: gamme.id, active: !gamme.active }),
              gamme.active ? "Gamme retirée des choix" : "Gamme réactivée"
            )
          }
          title={
            gamme.active
              ? "La retirer des listes de choix — les produits qui la portent la gardent"
              : "La remettre dans les listes de choix"
          }
          className="ml-auto h-8 gap-1.5 rounded-lg text-xs text-stone-500 hover:text-stone-800"
        >
          {gamme.active ? <EyeOff className="h-3.5 w-3.5" /> : <Undo2 className="h-3.5 w-3.5" />}
          {gamme.active ? "Retirer" : "Réactiver"}
        </Button>
      </div>

      <div className="mt-3 space-y-1.5 border-l-2 border-stone-100 pl-4">
        {gamme.sousGammes.length === 0 && (
          <p className="text-xs italic text-stone-400">Aucune sous-gamme.</p>
        )}
        {gamme.sousGammes.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <NomEditable
              valeur={s.nom}
              aria={`Nom de la sous-gamme ${s.nom}`}
              onEnregistrer={(nom) =>
                agir(() => renommerSousGammeAction({ id: s.id, nom }), "Sous-gamme renommée")
              }
            />
            <span className="shrink-0 text-[11px] text-stone-400">
              {s.nbProduits} produit{s.nbProduits > 1 ? "s" : ""}
            </span>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-1">
          <input
            value={ajout}
            onChange={(e) => setAjout(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || ajout.trim().length < 2) return;
              const nom = ajout.trim();
              agir(() => creerSousGammeAction({ gammeId: gamme.id, nom }), "Sous-gamme créée");
              setAjout("");
            }}
            placeholder="Ajouter une sous-gamme…"
            aria-label={`Ajouter une sous-gamme à ${gamme.nom}`}
            className="h-8 min-w-[14rem] flex-1 rounded-lg border border-transparent bg-stone-50 px-2 text-xs text-stone-700 hover:border-stone-200 focus:border-emerald-400 focus:bg-white focus:outline-none"
          />
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-stone-400" />
          ) : (
            <Plus className="h-3.5 w-3.5 shrink-0 text-stone-300" />
          )}
        </div>
      </div>
    </div>
  );
}

/** Champ qui n'enregistre qu'à la sortie, et se réaligne sur le serveur. */
function NomEditable({
  valeur,
  aria,
  gras,
  onEnregistrer,
}: {
  valeur: string;
  aria: string;
  gras?: boolean;
  onEnregistrer: (nom: string) => void;
}) {
  const [brouillon, setBrouillon] = useState(valeur);
  const [connue, setConnue] = useState(valeur);
  if (valeur !== connue) {
    setConnue(valeur);
    setBrouillon(valeur);
  }

  return (
    <input
      value={brouillon}
      onChange={(e) => setBrouillon(e.target.value)}
      onBlur={() => {
        const nom = brouillon.trim();
        if (nom !== valeur && nom.length >= 2) onEnregistrer(nom);
        else setBrouillon(valeur);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setBrouillon(valeur);
      }}
      aria-label={aria}
      className={cn(
        "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-stone-800",
        "hover:border-stone-200 focus:border-emerald-400 focus:bg-white focus:outline-none",
        gras ? "text-base font-bold" : "text-xs"
      )}
    />
  );
}
