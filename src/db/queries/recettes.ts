import { cache } from "react";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { recettes, ingredientsRecette, auditLogs, matieresPremieres } from "@/db/schema";
import { evaluerDemeter, type RecetteCalculee } from "@/lib/business-rules/recette";
import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent";

interface SaveRecetteParams {
  produitId: string;
  version: string;
  developpeur?: string;
  calc: RecetteCalculee;
  descriptifModification?: string;
  raisonModification?: string;
  incidenceEtiquetage?: boolean;
}

/**
 * Feeds the raw-material reference from what an import just revealed.
 *
 * Only `codeArticle` → `designationRd` is written, and never over an existing
 * row: the legal denomination and the markers are a human's answer, and a later
 * import must not undo it. The table therefore fills itself as products come in,
 * and stays correct where someone has already qualified a material.
 */
async function alimenterMatieresPremieres(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  calc: RecetteCalculee
): Promise<void> {
  const lignes = calc.ingredients
    .filter((i) => i.codeArticle.trim() !== "")
    .map((i) => ({
      codeArticle: i.codeArticle.trim().slice(0, 50),
      designationRd: i.designation.slice(0, 255),
      estDemeter: i.estDemeter,
      estEquitable: i.estEquitable,
    }));
  if (lignes.length === 0) return;

  await tx.insert(matieresPremieres).values(lignes).onConflictDoNothing({
    target: matieresPremieres.codeArticle,
  });
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
  descriptifModification,
  raisonModification,
  incidenceEtiquetage,
}: SaveRecetteParams) {
  return db.transaction(async (tx) => {
    // The previous version is superseded, not overwritten: comparing before and
    // after is the only way to tell whether a substitution changes the declared
    // list — and therefore whether the BAT still holds.
    await tx
      .update(recettes)
      .set({ statut: "ARCHIVED", misAJourLe: new Date() })
      .where(and(eq(recettes.produitId, produitId), ne(recettes.statut, "ARCHIVED")));

    const [recette] = await tx
      .insert(recettes)
      .values({
        produitId,
        version,
        developpeur,
        descriptifModification,
        raisonModification,
        incidenceEtiquetage,
        pourcentageTotal: calc.totalPourcentageEtiquette,
      })
      .returning();

    await alimenterMatieresPremieres(tx, calc);

    if (calc.ingredients.length > 0) {
      await tx.insert(ingredientsRecette).values(
        calc.ingredients.map((ing) => ({
          recetteId: recette.id,
          codeArticle: ing.codeArticle,
          designation: ing.designation,
          estBio: ing.estBio,
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
    // La recette COURANTE : les versions remplacées passent en ARCHIVED et ne
    // doivent plus alimenter la fiche ni l'audit.
    const recette = await db.query.recettes.findFirst({
      where: and(eq(recettes.produitId, produitId), ne(recettes.statut, "ARCHIVED")),
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
      masquerEtiquette: r.masquerPourcentageEtiquette,
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
  /** Per-ingredient "hide % on label" flags, same order as calc. */
  masques: boolean[];
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
  masques,
}: ValiderRecetteParams) {
  return db.transaction(async (tx) => {
    const existante = await tx.query.recettes.findFirst({
      where: and(eq(recettes.produitId, produitId), ne(recettes.statut, "ARCHIVED")),
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
        masquerPourcentageEtiquette: masques[i] ?? false,
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

/**
 * Une recette VALIDÉE existe-t-elle pour ce produit ?
 *
 * La fiche recette est le document de référence, validé pour la production par
 * Marie et Aurélie ; la fiche dégustation n'est qu'un point de départ. Une
 * ré-intégration de dégustation ne doit donc pas écraser une composition déjà
 * validée — elle la signale comme un écart, et Marie tranche.
 */
export async function aRecetteValidee(produitId: string): Promise<boolean> {
  const r = await db.query.recettes.findFirst({
    where: and(eq(recettes.produitId, produitId), eq(recettes.statut, "VALIDATED")),
    columns: { id: true },
  });
  return !!r;
}
