import { cache } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { fichesEtiquettes, produits, recettes, ingredientsRecette } from "@/db/schema";
import type { AuditInput } from "@/lib/audit/types";

/**
 * Assembles the deterministic audit input for a fiche: label fields + product
 * fields + the latest recette's ingredient lines (incl. the audit-backing
 * columns est_camellia / code_oc / contient_reglisse). Pure read; the audit
 * logic itself lives in `src/lib/audit` and never touches the DB.
 *
 * Returns null if the fiche (or its product) is missing.
 */
export const getAuditInputForFiche = cache(
  async (ficheId: string): Promise<AuditInput | null> => {
    const fiche = await db.query.fichesEtiquettes.findFirst({
      where: eq(fichesEtiquettes.id, ficheId),
    });
    if (!fiche) return null;

    const produit = await db.query.produits.findFirst({
      where: eq(produits.id, fiche.produitId),
    });
    if (!produit) return null;

    const recette = await db.query.recettes.findFirst({
      where: eq(recettes.produitId, produit.id),
      orderBy: [desc(recettes.creeLe)],
    });

    const lignes = recette
      ? await db.query.ingredientsRecette.findMany({
          where: eq(ingredientsRecette.recetteId, recette.id),
          orderBy: [ingredientsRecette.ordreTri],
        })
      : [];

    return {
      fiche: {
        ingredientsFr: fiche.ingredientsFr,
        allergenes: fiche.allergenes,
        allegationsSanteFr: fiche.allegationsSanteFr,
        mentionConservation: fiche.mentionConservation,
        mentionFabricant: fiche.mentionFabricant,
        codeEtiquette: fiche.codeEtiquette,
        denominationLegale: fiche.denominationLegale,
      },
      produit: {
        typeTheFr: produit.typeTheFr,
        denominationFr: produit.denominationFr,
        estAromatise: produit.estAromatise,
        poidsNet: produit.poidsNet,
        codeOc: produit.codeOc,
        contientReglisse: produit.contientReglisse,
        allergenesMp: produit.allergenesMp,
        codeEan: produit.codeEan,
      },
      ingredients: lignes.map((l) => ({
        codeArticle: l.codeArticle,
        designation: l.designation,
        quantiteKg: l.quantiteKg,
        pourcentageBrut: l.pourcentageBrut,
        pourcentageEtiquette: l.pourcentageEtiquette,
        estDemeter: l.estDemeter,
        estEquitable: l.estEquitable,
        estCamellia: l.estCamellia,
        ordreTri: l.ordreTri,
      })),
    };
  }
);
