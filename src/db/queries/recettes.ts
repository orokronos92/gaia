import { cache } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { recettes, ingredientsRecette } from "@/db/schema";
import { evaluerDemeter, type RecetteCalculee } from "@/lib/business-rules/recette";
import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent";

interface SaveRecetteParams {
  produitId: string;
  version: string;
  developpeur?: string;
  calc: RecetteCalculee;
}

/**
 * Persists a computed recipe and its ingredients atomically (mutation touches
 * two tables → transaction, CLAUDE.md §6). Returns the created `recettes` row.
 */
export async function saveRecette({
  produitId,
  version,
  developpeur,
  calc,
}: SaveRecetteParams) {
  return db.transaction(async (tx) => {
    const [recette] = await tx
      .insert(recettes)
      .values({
        produitId,
        version,
        developpeur,
        pourcentageTotal: calc.totalPourcentageEtiquette,
      })
      .returning();

    if (calc.ingredients.length > 0) {
      await tx.insert(ingredientsRecette).values(
        calc.ingredients.map((ing) => ({
          recetteId: recette.id,
          codeArticle: ing.codeArticle,
          designation: ing.designation,
          estDemeter: ing.estDemeter,
          estEquitable: ing.estEquitable,
          quantiteKg: ing.quantiteKg,
          pourcentageBrut: ing.pourcentageBrut,
          pourcentageEtiquette: ing.pourcentageEtiquette,
          ordreTri: ing.ordreTri,
        }))
      );
    }

    return recette;
  });
}

/**
 * Loads the latest recipe for a product, shaped as `RecetteAgentOutput` for the
 * UI (SPEC-03). Demeter is recomputed from the stored flags via the SPEC-02
 * pure engine (it is not persisted on `recettes`). Returns null if none.
 */
export const getRecetteOutputForProduit = cache(
  async (produitId: string): Promise<RecetteAgentOutput | null> => {
    const recette = await db.query.recettes.findFirst({
      where: eq(recettes.produitId, produitId),
      orderBy: [desc(recettes.creeLe)],
    });
    if (!recette) return null;

    const rows = await db.query.ingredientsRecette.findMany({
      where: eq(ingredientsRecette.recetteId, recette.id),
      orderBy: [ingredientsRecette.ordreTri],
    });
    if (rows.length === 0) return null;

    const ingredients = rows.map((r) => ({
      codeArticle: r.codeArticle,
      designation: r.designation,
      quantiteKg: r.quantiteKg,
      pourcentageBrut: r.pourcentageBrut,
      pourcentageEtiquette: r.pourcentageEtiquette,
      estDemeter: r.estDemeter,
      estEquitable: r.estEquitable,
      ordreTri: r.ordreTri,
    }));

    const totalKg =
      Math.round(ingredients.reduce((s, i) => s + i.quantiteKg, 0) * 1000) /
      1000;
    const totalPourcentageEtiquette =
      recette.pourcentageTotal ??
      Math.round(
        ingredients.reduce((s, i) => s + i.pourcentageEtiquette, 0) * 100
      ) / 100;

    return {
      ingredients,
      totalKg,
      totalPourcentageEtiquette,
      demeter: evaluerDemeter(ingredients),
    };
  }
);

export const getRecetteWithIngredients = cache(async (recetteId: string) => {
  const recette = await db.query.recettes.findFirst({
    where: eq(recettes.id, recetteId),
  });
  if (!recette) return null;

  const ingredients = await db.query.ingredientsRecette.findMany({
    where: eq(ingredientsRecette.recetteId, recetteId),
  });

  return { ...recette, ingredients };
});
