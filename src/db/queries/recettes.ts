import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recettes, ingredientsRecette } from "@/db/schema";
import type { RecetteCalculee } from "@/lib/business-rules/recette";

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
