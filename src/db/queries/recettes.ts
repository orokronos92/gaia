import { cache } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { recettes, ingredientsRecette, auditLogs } from "@/db/schema";
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

export interface ValiderRecetteParams {
  produitId: string;
  version: string;
  utilisateurId: string;
  /** Server-recomputed result (figures never trusted from the client). */
  calc: RecetteCalculee;
  /** Effective label % per ingredient (Marie's overrides applied), same order as calc. */
  etiquettesEffectives: number[];
}

/**
 * Validates a recipe (SPEC-03b §7): upserts the latest `recettes` row to
 * VALIDATED, replaces its `ingredients_recette` lines, and writes a
 * `RECETTE_VALIDEE` audit log — all atomically (CLAUDE.md §6). Marie owns the
 * decision; this only persists it.
 */
export async function validerRecette({
  produitId,
  version,
  utilisateurId,
  calc,
  etiquettesEffectives,
}: ValiderRecetteParams) {
  return db.transaction(async (tx) => {
    const existante = await tx.query.recettes.findFirst({
      where: eq(recettes.produitId, produitId),
      orderBy: [desc(recettes.creeLe)],
    });

    const pourcentageTotal =
      Math.round(etiquettesEffectives.reduce((s, v) => s + v, 0) * 100) / 100;

    let recetteId: string;
    if (existante) {
      await tx
        .update(recettes)
        .set({
          version,
          statut: "VALIDATED",
          pourcentageTotal,
          misAJourLe: new Date(),
        })
        .where(eq(recettes.id, existante.id));
      recetteId = existante.id;
      await tx
        .delete(ingredientsRecette)
        .where(eq(ingredientsRecette.recetteId, recetteId));
    } else {
      const [created] = await tx
        .insert(recettes)
        .values({ produitId, version, statut: "VALIDATED", pourcentageTotal })
        .returning();
      recetteId = created.id;
    }

    await tx.insert(ingredientsRecette).values(
      calc.ingredients.map((ing, i) => ({
        recetteId,
        codeArticle: (ing.codeArticle || "").slice(0, 50),
        designation: ing.designation,
        estDemeter: ing.estDemeter,
        estEquitable: ing.estEquitable,
        quantiteKg: ing.quantiteKg,
        pourcentageBrut: ing.pourcentageBrut,
        pourcentageEtiquette: etiquettesEffectives[i] ?? ing.pourcentageEtiquette,
        ordreTri: ing.ordreTri,
      }))
    );

    await tx.insert(auditLogs).values({
      typeEntite: "recette",
      entiteId: recetteId,
      action: "RECETTE_VALIDEE",
      utilisateurId,
      changements: {
        produitId,
        version,
        pourcentageTotal,
        lignes: calc.ingredients.map((ing, i) => ({
          codeArticle: ing.codeArticle,
          designation: ing.designation,
          quantiteKg: ing.quantiteKg,
          pourcentageEtiquette:
            etiquettesEffectives[i] ?? ing.pourcentageEtiquette,
        })),
      },
    });

    return { recetteId };
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
