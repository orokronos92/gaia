"use client";

import type { ChoixGamme } from "@/db/queries/gammes";

/**
 * Le choix de la gamme et de sa sous-gamme, dans le référentiel.
 *
 * C'était deux champs de saisie libre, et le catalogue en portait la trace :
 * douze libellés pour environ sept gammes. Ce n'est pas qu'une question de
 * propreté — la gamme décide des mentions exigées sur l'étiquette, et une casse
 * différente éteignait le contrôle sans le dire (décision 2026-09-10).
 *
 * La sous-gamme n'offre que celles de la gamme choisie : « AGIR POUR LA NATURE »
 * ne peut plus se retrouver sous « Les Grands Crus ».
 *
 * Une gamme retirée des choix reste proposée **si le produit la porte déjà** :
 * sinon la liste lui en attribuerait une autre au premier enregistrement.
 */
export function ChoixGammeSousGamme({
  choix,
  gamme,
  sousGamme,
  onGamme,
  onSousGamme,
}: {
  choix: ChoixGamme[];
  gamme: string;
  sousGamme: string;
  onGamme: (v: string) => void;
  onSousGamme: (v: string) => void;
}) {
  const proposables = choix.filter((g) => g.active || g.nom === gamme);
  const courante = choix.find((g) => g.nom === gamme);
  const sousProposables = (courante?.sousGammes ?? []).filter(
    (s) => s.active || s.nom === sousGamme
  );

  const classe =
    "ml-1 bg-transparent border-b border-emerald-300 text-stone-900 focus:border-emerald-500 focus:outline-none";

  return (
    <>
      <select
        value={gamme}
        onChange={(e) => {
          onGamme(e.target.value);
          // La sous-gamme appartient à sa gamme : en changer invalide l'autre.
          onSousGamme("");
        }}
        aria-label="Gamme du produit"
        className={`${classe} w-56`}
      >
        {gamme === "" && <option value="">— à choisir —</option>}
        {proposables.map((g) => (
          <option key={g.id} value={g.nom}>
            {g.nom}
            {!g.active ? " (retirée)" : ""}
          </option>
        ))}
      </select>
      <select
        value={sousGamme}
        onChange={(e) => onSousGamme(e.target.value)}
        aria-label="Sous-gamme du produit"
        disabled={sousProposables.length === 0}
        className={`${classe} w-44 disabled:text-stone-400`}
      >
        <option value="">
          {sousProposables.length === 0 ? "— aucune —" : "— sans sous-gamme —"}
        </option>
        {sousProposables.map((s) => (
          <option key={s.id} value={s.nom}>
            {s.nom}
            {!s.active ? " (retirée)" : ""}
          </option>
        ))}
      </select>
    </>
  );
}
