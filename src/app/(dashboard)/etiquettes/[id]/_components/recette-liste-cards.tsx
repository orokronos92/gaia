import { FlaskConical, BookOpen, EyeOff, AlertTriangle, Tag } from "lucide-react";

import { RecetteEtiquetteCarte } from "./recette-etiquette-carte";

import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent";
import { differentielDepuisTexte } from "@/lib/recette/differentiel";

export interface RecetteListeCardsProps {
  recette: RecetteAgentOutput | null;
  /**
   * Le texte recopié de la fiche dégustation. C'est le point de départ du
   * comité, pas une référence : il est antérieur à la recette de production et
   * ne la suit pas — sur TA737 il compte six ingrédients quand la recette en a
   * sept. Affiché pour mémoire ; l'audit lit la recette étiquette.
   */
  ingredientsFr?: string | null;
  ficheId: string;
}

const nb = (v: number, d = 3) =>
  v.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: d });

/**
 * Les états d'une composition, dans l'ordre où on les traverse.
 *
 * L'arrondi QUID avait sa propre carte. Ce n'est pas une recette : c'est une
 * colonne de la recette de production, calculée à partir des mêmes kilos. Lui
 * donner une carte entière laissait croire à trois étapes là où il n'y en a que
 * deux, et faisait douter des deux autres (décision 2026-09-10).
 *
 *   ce qu'on pèse et ce qu'on en calcule  →  ce qui est déclaré
 *   kg, % brut, % arrondi Σ=100              le texte comparé au BAT
 *
 * Chaque flèche est un endroit où une erreur entre, et chacune a son point de
 * contrôle : l'arrondi en 3.2, l'ajustement en 3.3, la liste elle-même en 2.2.
 *
 * La place libérée revient à la RECETTE ÉTIQUETTE (lot C) : le brouillon que
 * Marie habille de dénominations légales, et que l'audit comparera au BAT.
 */
export function RecetteListeCards({ recette, ingredientsFr, ficheId }: RecetteListeCardsProps) {
  // Les trois cartes se montrent toujours, même vides.
  //
  // Sans recette, elles disparaissaient toutes les trois derrière un encadré
  // « Aucune recette validée » — y compris le rappel dégustation, qui portait
  // pourtant du texte. Après un import de la seule fiche dégustation, l'écran
  // annonçait donc qu'il n'avait rien alors qu'il avait la liste d'ingrédients
  // du comité. Une carte vide dit ce qui manque et d'où ça vient ; une carte
  // absente ne dit rien.
  const aRecette = recette !== null && recette.ingredients.length > 0;
  const ings = aRecette ? [...recette.ingredients].sort((a, b) => a.ordreTri - b.ordreTri) : [];
  const masques = aRecette ? recette.ingredients.map((i) => i.masquerEtiquette) : [];
  const nbMasques = masques.filter(Boolean).length;
  const totalBrut = ings.reduce((s, i) => s + i.pourcentageBrut, 0);
  const totalKg = ings.reduce((s, i) => s + i.quantiteKg, 0);

  // Un écart de dénomination — un ingrédient présent d'un côté et pas de l'autre
  // — veut dire que les deux textes ne parlent pas des mêmes matières. Un écart
  // de pourcentage, non : c'est l'arrondi, et c'est normal.
  const ecarts = aRecette
    ? differentielDepuisTexte(
        ingredientsFr,
        recette.ingredients.map((i, n) => ({
          designation: i.designation,
          pourcentage: masques[n] ? null : i.pourcentageEtiquette,
        }))
      )
    : [];
  const denominationsDivergentes = ecarts.filter((e) => e.type !== "pourcentage").length;

  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <Carte
        icone={FlaskConical}
        titre="Recette de production"
        sousTitre={nbMasques > 0 ? `ce qui est pesé · ${nbMasques} % masqué${nbMasques > 1 ? "s" : ""}` : "ce qui est pesé et calculé"}
        ton="stone"
      >
        {!aRecette ? (
          <Vide
            quoi="Aucune recette de production."
            dou="Elle arrive avec la fiche recette (Excel) — bouton « Ré-intégrer », ou depuis l'onglet Recette / QUID."
          />
        ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
              <th className="pb-1 text-left font-bold">Ingrédient</th>
              <th className="pb-1 pr-2 text-right font-bold">kg</th>
              <th className="pb-1 pr-2 text-right font-bold">% brut</th>
              <th className="pb-1 text-right font-bold text-sky-700">% arrondi</th>
            </tr>
          </thead>
          <tbody>
            {ings.map((i) => (
              <tr key={`${i.codeArticle}-${i.ordreTri}`} className="border-b border-stone-100 last:border-0">
                <td className="py-1 pr-2 font-medium text-stone-700">
                  {i.designation}
                  {i.masquerEtiquette && (
                    <EyeOff className="ml-1 inline size-3 text-stone-400" aria-label="% masqué sur l'étiquette" />
                  )}
                </td>
                <td className="py-1 pr-2 text-right tabular-nums text-stone-500">{nb(i.quantiteKg)} kg</td>
                <td className="py-1 pr-2 text-right tabular-nums text-stone-500">{nb(i.pourcentageBrut)} %</td>
                <td className="py-1 text-right font-semibold tabular-nums text-sky-800">{nb(i.pourcentageEtiquette, 2)} %</td>
              </tr>
            ))}
            <tr>
              <td className="pt-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">Total</td>
              <td className="pt-1.5 pr-2 text-right tabular-nums text-stone-500">{nb(totalKg)} kg</td>
              <td className="pt-1.5 pr-2 text-right tabular-nums text-stone-500">{nb(totalBrut)} %</td>
              <td className="pt-1.5 text-right font-bold tabular-nums text-sky-800">
                {nb(recette.totalPourcentageEtiquette, 2)} %
              </td>
            </tr>
          </tbody>
        </table>
        )}
      </Carte>

      {aRecette ? (
        <RecetteEtiquetteCarte ficheId={ficheId} recette={recette} />
      ) : (
        <Carte icone={Tag} titre="Recette étiquette" sousTitre="ce qui sera imprimé, comparé au BAT" ton="sky">
          <Vide
            quoi="Pas encore de recette étiquette."
            dou="Elle se crée à partir de la recette de production, à sa validation. La Qualité y reprend ensuite les dénominations imprimées."
          />
        </Carte>
      )}

      <Carte
        icone={BookOpen}
        titre="Rappel dégustation"
        sousTitre="le point de départ du comité"
        ton="emerald"
        badge={
          denominationsDivergentes > 0
            ? { icone: AlertTriangle, texte: `${denominationsDivergentes} écart(s) avec la recette` }
            : undefined
        }
      >
        {ingredientsFr?.trim() ? (
          <p className="text-sm font-medium leading-relaxed text-emerald-900">{ingredientsFr}</p>
        ) : (
          <Vide
            quoi="Aucune liste dans la fiche dégustation."
            dou="Elle est recopiée du document du comité à l'import — le texte sous « Liste d'ingrédient »."
          />
        )}
      </Carte>
    </div>
  );
}

const TONS = {
  stone: "border-stone-200/60 bg-white",
  sky: "border-sky-200/60 bg-sky-50/40",
  emerald: "border-emerald-200/60 bg-emerald-50/40",
} as const;

const TITRES = {
  stone: "text-stone-400",
  sky: "text-sky-700",
  emerald: "text-emerald-700",
} as const;

function Carte({
  icone: Icone,
  titre,
  sousTitre,
  ton,
  badge,
  children,
}: {
  icone: typeof BookOpen;
  titre: string;
  sousTitre: string;
  ton: keyof typeof TONS;
  badge?: { icone: typeof BookOpen; texte: string };
  children: React.ReactNode;
}) {
  const Badge = badge?.icone;
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${TONS[ton]}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${TITRES[ton]}`}>
          <Icone className="size-3.5" /> {titre}
          <span className="font-semibold normal-case tracking-normal text-stone-400">· {sousTitre}</span>
        </div>
        {badge && Badge && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
            <Badge className="size-3" /> {badge.texte}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/** Ce que la carte attend, et d'où ça vient — une carte vide reste bavarde. */
function Vide({ quoi, dou }: { quoi: string; dou: string }) {
  return (
    <div className="py-3">
      <p className="text-sm font-medium text-stone-500">{quoi}</p>
      <p className="mt-1 text-xs leading-relaxed text-stone-400">{dou}</p>
    </div>
  );
}

export default RecetteListeCards;
