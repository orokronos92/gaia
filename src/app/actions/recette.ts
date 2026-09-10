"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { computeRecette } from "@/lib/business-rules/recette";
import {
  getRecetteOutputForProduit,
  renommerIngredientEtiquette,
  validerRecette,
} from "@/db/queries/recettes";
import { getFicheProduitId, remplirMentionDemeterSiVide } from "@/db/queries/fiches";
import { writeAuditLog } from "@/db/queries/audit-logs";
import { DEMETER_PHRASE_TYPE } from "@/lib/audit/statut-mention";
import { CopilotAgent } from "@/agents/copilot-agent";

const IngredientPayload = z.object({
  codeArticle: z.string().nullable(),
  designation: z.string().min(1),
  quantiteKg: z.number().positive(),
  estDemeter: z.boolean(),
  estEquitable: z.boolean(),
  overrideEtiquette: z.number().nullable(),
  masquerEtiquette: z.boolean(),
});

const ValiderPayload = z.object({
  produitId: z.string().uuid(),
  ficheId: z.string().uuid().optional(),
  version: z.string().min(1).optional(),
  pas: z.union([z.literal(0.5), z.literal(1)]),
  ingredients: z.array(IngredientPayload).min(1),
});

/**
 * Validates and persists the recipe (SPEC-03b §7). Figures are RECOMPUTED here
 * via computeRecette — the client's numbers are never trusted; only kg, flags
 * and Marie's explicit overrides come from the UI. Σ=100 is enforced server-side.
 */
export async function validerRecetteAction(input: unknown) {
  const data = ValiderPayload.parse(input);

  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const calc = computeRecette({
    ingredients: data.ingredients.map((i) => ({
      codeArticle: i.codeArticle ?? "",
      designation: i.designation,
      quantiteKg: i.quantiteKg,
      estDemeter: i.estDemeter,
      estEquitable: i.estEquitable,
    })),
    precisionArrondi: data.pas,
  });

  const etiquettesEffectives = data.ingredients.map(
    (i, idx) => i.overrideEtiquette ?? calc.ingredients[idx].pourcentageEtiquette
  );
  // Hide-% flags, aligned positionally with calc.ingredients (computeRecette
  // preserves input order, same invariant the override mapping above relies on).
  const masques = data.ingredients.map((i) => i.masquerEtiquette);
  const total =
    Math.round(etiquettesEffectives.reduce((s, v) => s + v, 0) * 100) / 100;
  if (Math.abs(total - 100) > 1e-6) {
    throw new Error(
      `Le total des pourcentages étiquette doit être 100 (actuel : ${total}).`
    );
  }

  const { recetteId } = await validerRecette({
    produitId: data.produitId,
    version: data.version,
    utilisateurId: session.user.id,
    calc,
    etiquettesEffectives,
    masques,
  });

  // Une recette qui porte une matière Demeter rend la note ** obligatoire dans
  // la liste d'ingrédients, et cette note a un texte fixé par le §11.1. La
  // Qualité le connaissait, l'application aussi — elle s'en servait déjà pour
  // contrôler le BAT — et lui demandait quand même de le retaper. La mention se
  // renseigne donc au moment où Marie valide la recette : c'est son geste, daté
  // et journalisé, pas une écriture que l'application ferait de son côté.
  //
  // Jamais par-dessus une saisie existante : si elle a écrit sa propre
  // formulation, elle reste.
  const matieresDemeter = calc.ingredients.filter((i) => i.estDemeter);
  if (data.ficheId && matieresDemeter.length > 0) {
    const remplie = await remplirMentionDemeterSiVide(data.ficheId, DEMETER_PHRASE_TYPE);
    if (remplie) {
      await writeAuditLog({
        typeEntite: "fiche_etiquette",
        entiteId: data.ficheId,
        action: "MENTION_DEMETER_RENSEIGNEE",
        utilisateurId: session.user.id,
        changements: {
          champ: "phraseDemeterFr",
          apres: DEMETER_PHRASE_TYPE,
          source: "PRO-QHS-013 §11.1",
          declencheur: `${matieresDemeter.length} matière(s) Demeter à la validation de la recette`,
          matieres: matieresDemeter.map((i) => i.designation),
          pourcentageDemeter: calc.demeter.pourcentageDemeter,
        },
      });
    }
  }

  // La liste déclarée n'est plus réécrite (décision 2026-09-10).
  //
  // Elle est le texte recopié de la fiche dégustation : le point de départ du
  // comité, antérieur à la recette de production et qui ne la suit pas. On
  // l'écrasait avec les dénominations R&D — « SORWATHE OP1 » là où l'étiquette
  // doit dire « thé noir » — ou on renonçait, et la Qualité perdait alors les
  // marqueurs Demeter. C'est la recette étiquette qui porte désormais les
  // dénominations imprimées, et c'est elle que l'audit compare au BAT.
  if (data.ficheId) revalidatePath(`/etiquettes/${data.ficheId}`);

  return { ok: true as const, recetteId };
}


const SuggererPayload = z.object({
  produitId: z.string().uuid(),
  contexte: z.string(),
  masseLotKg: z.number().nullable(),
  connus: z.array(
    z.object({
      designation: z.string(),
      pourcentage: z.number().nullable(),
      quantiteKg: z.number().nullable(),
    })
  ),
  manquants: z.array(z.string().min(1)).min(1),
});

/**
 * Non-binding AI suggestion of missing quantities (SPEC-03b §6). Reuses the
 * existing CopilotAgent/RAG; writes nothing.
 */
export async function suggererQuantitesAction(input: unknown) {
  const data = SuggererPayload.parse(input);

  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const agent = new CopilotAgent();
  return agent.suggererQuantites({
    produitContexte: data.contexte,
    connus: data.connus,
    manquants: data.manquants,
    masseLotKg: data.masseLotKg,
  });
}

const RenommerPayload = z.object({
  ficheId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  /** Vide = on efface la reprise et la ligne retombe sur le nom R&D. */
  designationEtiquette: z.string().max(255),
});

/**
 * Renomme un ingrédient TEL QU'IL SERA IMPRIMÉ (décision 2026-09-10).
 *
 * La recette continue de dire « SORWATHE OP1 » — c'est le nom qui désigne le lot
 * à peser. L'étiquette dira « thé noir ». Seule cette seconde dénomination est
 * touchée ; les pourcentages, marqueurs et ordre restent calculés, et rien ici
 * ne recalcule quoi que ce soit.
 *
 * Le produit est résolu depuis la fiche côté serveur : l'identifiant de ligne
 * envoyé par le navigateur ne prouve rien tant qu'on n'a pas vérifié qu'il
 * appartient bien à ce produit (CLAUDE.md §8).
 */
export async function renommerIngredientEtiquetteAction(input: unknown) {
  const data = RenommerPayload.parse(input);

  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Non autorisé." };

  const produitId = await getFicheProduitId(data.ficheId);
  if (!produitId) return { ok: false as const, error: "Fiche introuvable." };

  const nom = data.designationEtiquette.trim();
  const applique = await renommerIngredientEtiquette({
    ingredientId: data.ingredientId,
    produitId,
    designationEtiquette: nom === "" ? null : nom,
  });
  if (!applique) return { ok: false as const, error: "Ingrédient hors de ce produit." };

  revalidatePath(`/etiquettes/${data.ficheId}`);
  return { ok: true as const, designationEtiquette: nom === "" ? null : nom };
}
