import type { ReactNode } from "react";

import { ReferentielsNav } from "./_components/referentiels-nav";

/**
 * Les référentiels — ce que le catalogue désigne, et qui existe sans lui.
 *
 * Une gamme existe même sans produit dedans, une matière première est partagée
 * par dix recettes, une opération caritative a sa propre durée de vie. Ces
 * choses-là n'étaient nulle part : soit saisies en texte libre sur chaque fiche
 * (la gamme), soit rangées dans Paramètres faute de mieux (les matières).
 *
 * Paramètres redevient ce qu'il doit être — les réglages de l'outil. Ici, c'est
 * le vocabulaire du métier, et c'est la Qualité qui le tient.
 */
export default function ReferentielsLayout({ children }: { children: ReactNode }) {
  return (
    <div data-wide className="mt-4 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-light tracking-tight text-emerald-950 dark:text-stone-50">
          Référentiels
        </h1>
        <p className="text-sm font-medium text-stone-500">
          Les listes que le catalogue désigne — gammes, matières, opérations
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <ReferentielsNav />
        <div className="col-span-1 space-y-6 md:col-span-3">{children}</div>
      </div>
    </div>
  );
}
