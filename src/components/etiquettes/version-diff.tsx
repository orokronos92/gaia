"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface VersionLite {
  numeroVersion: number;
  donneesSnapshot: unknown;
}

/** Fields compared between two snapshots (table + key + human label). */
const CHAMPS_COMPARE: { label: string; table: string; key: string }[] = [
  { label: "Titre", table: "produit", key: "denominationFr" },
  { label: "Type de thé", table: "produit", key: "typeTheFr" },
  { label: "Origine", table: "produit", key: "origine" },
  { label: "Conditionnement", table: "produit", key: "conditionnement" },
  { label: "Poids net", table: "produit", key: "poidsNet" },
  { label: "Infusion", table: "produit", key: "tempsInfusion" },
  { label: "Température", table: "produit", key: "tempInfusion" },
  { label: "Tasses", table: "produit", key: "nbTasses" },
  { label: "Sous-désignation", table: "produit", key: "sousDesignationFr" },
  { label: "Déclinaisons", table: "produit", key: "declinaisons" },
  { label: "Fournisseur", table: "produit", key: "fournisseur" },
  { label: "Ingrédients (FR)", table: "fiche", key: "ingredientsFr" },
  { label: "Allergènes", table: "fiche", key: "allergenes" },
  { label: "Allégations santé", table: "fiche", key: "allegationsSanteFr" },
  { label: "Allégation choisie", table: "fiche", key: "allegationChoisie" },
  { label: "Nb tasses (allégation)", table: "fiche", key: "nbTassesAllegation" },
  { label: "Texte commercial", table: "fiche", key: "texteCommercialFr" },
  { label: "Mention WFTO", table: "fiche", key: "phraseWftoFr" },
  { label: "Conservation", table: "fiche", key: "mentionConservation" },
  { label: "Fabricant", table: "fiche", key: "mentionFabricant" },
  { label: "Statut", table: "fiche", key: "statut" },
  { label: "Total QUID %", table: "recette", key: "pourcentageTotal" },
  { label: "Saveur en bouche", table: "degustation", key: "saveurBouche" },
  { label: "Parfum (infusion)", table: "degustation", key: "infusionParfum" },
  { label: "Senteur (feuilles sèches)", table: "degustation", key: "feuillesSechesSenteur" },
];

const valeur = (v: VersionLite, table: string, key: string): string => {
  const snap = (v.donneesSnapshot ?? {}) as Record<string, Record<string, unknown>>;
  const raw = snap[table]?.[key];
  return raw == null ? "" : String(raw);
};

export function VersionDiff({ a, b }: { a: VersionLite; b: VersionLite }) {
  const [tout, setTout] = useState(false);
  // Older version on the left, newer on the right.
  const [g, d] = a.numeroVersion <= b.numeroVersion ? [a, b] : [b, a];

  const lignes = CHAMPS_COMPARE.map((c) => ({
    ...c,
    vg: valeur(g, c.table, c.key),
    vd: valeur(d, c.table, c.key),
  }));
  const diffs = lignes.filter((l) => l.vg !== l.vd);
  const affichees = tout ? lignes : diffs;

  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-white/80 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-800">
          Comparaison
          <span className="rounded-md bg-stone-100 px-2 py-0.5 tabular-nums">V{g.numeroVersion}</span>
          <ArrowRight className="size-4 text-stone-400" />
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 tabular-nums text-emerald-800">V{d.numeroVersion}</span>
          <span className="ml-1 text-xs font-medium text-stone-400">
            ({diffs.length} différence{diffs.length > 1 ? "s" : ""})
          </span>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setTout((t) => !t)} className="text-xs text-stone-500">
          {tout ? "Voir seulement les changements" : "Voir tous les champs"}
        </Button>
      </div>

      {diffs.length === 0 ? (
        <p className="p-6 text-center text-sm text-stone-400">
          Aucune différence sur les champs suivis entre ces deux versions.
        </p>
      ) : (
        <div className="divide-y divide-stone-100">
          {affichees.map((l) => {
            const change = l.vg !== l.vd;
            return (
              <div key={`${l.table}.${l.key}`} className="grid grid-cols-[150px_1fr_1fr] gap-3 p-3 text-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{l.label}</span>
                <span className={cn("break-words", change ? "rounded bg-red-50 px-2 py-1 text-red-700 line-through decoration-red-300" : "text-stone-600")}>
                  {l.vg || "—"}
                </span>
                <span className={cn("break-words", change ? "rounded bg-emerald-50 px-2 py-1 font-medium text-emerald-800" : "text-stone-600")}>
                  {l.vd || "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default VersionDiff;
