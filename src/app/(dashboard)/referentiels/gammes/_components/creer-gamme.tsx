"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { creerGammeAction } from "@/app/actions/gammes";

/** Saisie d'une nouvelle gamme. Le doublon exact est refusé côté serveur. */
export function CreerGamme() {
  const [nom, setNom] = useState("");
  const [pending, start] = useTransition();

  const creer = () => {
    const valeur = nom.trim();
    if (valeur.length < 2) return;
    start(async () => {
      const r = await creerGammeAction({ nom: valeur });
      if (r.ok) {
        setNom("");
        toast.success(`Gamme « ${valeur} » créée`);
      } else {
        toast.error("Création impossible", { description: r.error });
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && creer()}
        placeholder="Nouvelle gamme — ex. LES ENGAGÉS"
        aria-label="Nom de la nouvelle gamme"
        className="h-10 min-w-[18rem] flex-1 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 focus:border-emerald-400 focus:outline-none"
      />
      <Button
        onClick={creer}
        disabled={pending || nom.trim().length < 2}
        className="h-10 gap-1.5 rounded-lg bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Créer la gamme
      </Button>
    </div>
  );
}
