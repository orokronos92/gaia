import { cache } from "react";
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { recettes, ingredientsRecette, auditLogs, matieresPremieres, fichesEtiquettes } from "@/db/schema";
import { evaluerDemeter, type RecetteCalculee } from "@/lib/business-rules/recette";
import { listeEtiquetteOuBdd } from "@/lib/recette/liste-ingredients";
import type { RecetteAgentOutput } from "@/agents/recette/RecetteAgent";

interface SaveRecetteParams {
  produitId: string;
  version: string;
  developpeur?: string;
  date?: Date;
  saveurOrigine?: string;
  calc: RecetteCalculee;
  descriptifModification?: string;
  raisonModification?: string;
  /** null = la fiche ne répond pas, ce qui n'est pas « non ». */
  incidenceEtiquetage?: boolean | null;
  /** DETERMINISTE (classeur lu) ou IA_DEGRADEE (gabarit non reconnu). */
  sourceExtraction?: string;
  /** Écarts entre notre arrondi QUID et la colonne % de JDG. */
  ecartsPourcentage?: unknown;
  /** Une extraction dégradée n'a pas lu les coches : elle ne qualifie rien. */
  qualifieLesMatieres?: boolean;
}

/**
 * Feeds the raw-material reference from what an import just revealed.
 *
 * A row that a human has qualified is never touched: the legal denomination and
 * the markers are Marie's answer, and no import may undo it. An unqualified row,
 * on the other hand, is only ever the residue of a previous import — and the
 * first import used to win forever, which is why TN592 SORWATHE OP1 still
 * carried a Demeter marker from a misread on 07/09 while the re-import had since
 * read it correctly as fair trade. So a fresh reading overwrites an unqualified
 * row, and only a reading: a degraded extraction has not read the ticks at all
 * and must not write them.
 */
async function alimenterMatieresPremieres(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  calc: RecetteCalculee,
  qualifieLesMatieres: boolean
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

  if (!qualifieLesMatieres) {
    // Le code n'a pas lu les coches : on n'enregistre que l'existence de la
    // matière, jamais un marqueur de certification deviné.
    await tx.insert(matieresPremieres).values(lignes).onConflictDoNothing({
      target: matieresPremieres.codeArticle,
    });
    return;
  }

  await tx
    .insert(matieresPremieres)
    .values(lignes)
    .onConflictDoUpdate({
      target: matieresPremieres.codeArticle,
      // Marie a tranché sur cette matière → sa réponse prime, on ne touche à rien.
      setWhere: isNull(matieresPremieres.qualifiePar),
      set: {
        designationRd: sql`excluded.designation_rd`,
        estDemeter: sql`excluded.est_demeter`,
        estEquitable: sql`excluded.est_equitable`,
        misAJourLe: new Date(),
      },
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
  date,
  saveurOrigine,
  calc,
  descriptifModification,
  raisonModification,
  incidenceEtiquetage,
  sourceExtraction,
  ecartsPourcentage,
  qualifieLesMatieres = false,
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
        date,
        saveurOrigine,
        descriptifModification,
        raisonModification,
        incidenceEtiquetage,
        sourceExtraction,
        ecartsPourcentage,
        pourcentageTotal: calc.totalPourcentageEtiquette,
      })
      .returning();

    await alimenterMatieresPremieres(tx, calc, qualifieLesMatieres);

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
      id: r.id,
      codeArticle: r.codeArticle,
      designation: r.designation,
      designationEtiquette: r.designationEtiquette,
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
  /**
   * Optionnel : la validation ne renomme pas la version. Le classeur dit « V.2 »
   * et la calculatrice n'a pas d'avis là-dessus — un défaut à « 1.0 » effaçait
   * silencieusement ce que l'import venait de lire.
   */
  version?: string;
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
          ...(version ? { version } : {}),
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
        .values({ produitId, version: version ?? "1.0", statut: "VALIDATED", pourcentageTotal })
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
        version: version ?? existante?.version ?? null,
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

/**
 * Renames one ingredient AS PRINTED, without touching the recipe.
 *
 * The R&D name stays: it is what tells the warehouse which lot to weigh. Only
 * the label wording moves, and only for a line that belongs to this product —
 * an ingredient id arriving from the browser proves nothing on its own
 * (CLAUDE.md §8). An empty string clears the override and the line falls back
 * to the R&D name, which is how Marie undoes a rename.
 */
export async function renommerIngredientEtiquette(params: {
  ingredientId: string;
  produitId: string;
  designationEtiquette: string | null;
}): Promise<boolean> {
  const lignes = await db
    .select({ id: ingredientsRecette.id })
    .from(ingredientsRecette)
    .innerJoin(recettes, eq(recettes.id, ingredientsRecette.recetteId))
    .where(
      and(
        eq(ingredientsRecette.id, params.ingredientId),
        eq(recettes.produitId, params.produitId)
      )
    );
  if (lignes.length === 0) return false;

  await db
    .update(ingredientsRecette)
    .set({ designationEtiquette: params.designationEtiquette })
    .where(eq(ingredientsRecette.id, params.ingredientId));
  return true;
}

/**
 * La recette étiquette d'un produit, sous forme de texte — ce que l'audit
 * compare au BAT. null quand aucune recette n'existe : mieux vaut un contrôle
 * qui dit « non vérifiable » qu'un contrôle qui juge le brouillon du comité.
 */
export const getListeEtiquetteProduit = cache(
  async (produitId: string): Promise<string | null> => {
    const recette = await db.query.recettes.findFirst({
      where: and(eq(recettes.produitId, produitId), ne(recettes.statut, "ARCHIVED")),
      orderBy: [desc(recettes.creeLe)],
      columns: { id: true },
    });
    const lignes = recette
      ? await db.query.ingredientsRecette.findMany({ where: eq(ingredientsRecette.recetteId, recette.id) })
      : [];
    // Without a recipe, the catalogue workbook's list stands in (migration 0031).
    const fiche = await db.query.fichesEtiquettes.findFirst({
      where: eq(fichesEtiquettes.produitId, produitId),
      orderBy: [desc(fichesEtiquettes.creeLe)],
      columns: { listeIngredientsBddFr: true },
    });
    return listeEtiquetteOuBdd(lignes, fiche?.listeIngredientsBddFr);
  }
);
