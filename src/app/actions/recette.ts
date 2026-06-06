"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { computeRecette } from "@/lib/business-rules/recette";
import { validerRecette } from "@/db/queries/recettes";
import { CopilotAgent } from "@/agents/copilot-agent";

const IngredientPayload = z.object({
  codeArticle: z.string().nullable(),
  designation: z.string().min(1),
  quantiteKg: z.number().positive(),
  estDemeter: z.boolean(),
  estEquitable: z.boolean(),
  overrideEtiquette: z.number().nullable(),
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
  const total =
    Math.round(etiquettesEffectives.reduce((s, v) => s + v, 0) * 100) / 100;
  if (Math.abs(total - 100) > 1e-6) {
    throw new Error(
      `Le total des pourcentages étiquette doit être 100 (actuel : ${total}).`
    );
  }

  const { recetteId } = await validerRecette({
    produitId: data.produitId,
    version: data.version ?? "1.0",
    utilisateurId: session.user.id,
    calc,
    etiquettesEffectives,
  });

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
