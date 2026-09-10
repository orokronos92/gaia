import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { auth } from "@/auth";
import { getGammesOrphelines, getReferentielGammes } from "@/db/queries/gammes";
import { doublonsProbables } from "@/lib/referentiels/gammes";

import { CreerGamme } from "./_components/creer-gamme";
import { LigneGamme } from "./_components/ligne-gamme";

/**
 * Le référentiel des gammes.
 *
 * La gamme d'un produit décide de contrôles réglementaires : la mention
 * « transporté à la voile » se déclenche si son libellé contient « voile »,
 * celle des Engagés s'il contient « engag ». Le champ étant une saisie libre,
 * une casse différente éteignait un contrôle sans le dire — les deux thés
 * Anemos, rangés en « Grand classiques », n'étaient pas contrôlés.
 *
 * L'amorçage a repris le catalogue tel qu'il est, accidents compris : le
 * référentiel doit d'abord dire la vérité avant de la corriger. Les libellés qui
 * se ressemblent sont signalés ; c'est la Qualité qui tranche.
 */
export default async function GammesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const gammes = await getReferentielGammes();
  const orphelines = await getGammesOrphelines();
  const doublons = doublonsProbables(gammes);
  const idsDouteux = new Set(doublons.flat().map((g) => g.id));
  const totalProduits = gammes.reduce((s, g) => s + g.nbProduits, 0);

  return (
    <>
      <div className="rounded-2xl border-none bg-white/60 p-8 shadow-xl shadow-stone-200/50 backdrop-blur-xl">
        <h2 className="mb-1 text-xl font-medium text-emerald-950">Gammes &amp; sous-gammes</h2>
        <p className="text-sm text-stone-500">
          La gamme n&apos;est pas qu&apos;un classement : elle décide des mentions exigées sur
          l&apos;étiquette. Elle se choisit donc dans cette liste, au lieu de se taper à
          chaque fiche.
        </p>
        <p className="mt-4 text-sm text-stone-600">
          {gammes.length} gamme{gammes.length > 1 ? "s" : ""} · {totalProduits} produit
          {totalProduits > 1 ? "s" : ""} rattaché{totalProduits > 1 ? "s" : ""}
        </p>

        {doublons.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {doublons.length} libellé{doublons.length > 1 ? "s" : ""} qui désigne
              {doublons.length > 1 ? "nt" : ""} peut-être la même gamme
            </p>
            <ul className="mt-2 space-y-1">
              {doublons.map((groupe) => (
                <li key={groupe.map((g) => g.id).join()} className="text-xs text-amber-800">
                  {groupe.map((g) => `« ${g.nom} » (${g.nbProduits})`).join("  ·  ")}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-amber-800/80">
              Renommer l&apos;un à l&apos;identique de l&apos;autre emmène ses produits avec lui.
            </p>
          </div>
        )}

        {orphelines.length > 0 && (
          <p className="mt-3 text-xs text-stone-500">
            Libellés portés par un produit et absents d&apos;ici : {orphelines.join(", ")}
          </p>
        )}

        <div className="mt-6">
          <CreerGamme />
        </div>
      </div>

      <div className="space-y-3">
        {gammes.map((gamme) => (
          <LigneGamme key={gamme.id} gamme={gamme} douteuse={idsDouteux.has(gamme.id)} />
        ))}
      </div>
    </>
  );
}
