import { cache } from "react";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { fichesEtiquettes, produits, recettes, ingredientsRecette } from "@/db/schema";
import type { AuditInput } from "@/lib/audit/types";
import type { BatTextInput } from "@/lib/audit/visual/text-robot";

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

    // L'unicité d'un GTIN ne se lit pas sur une fiche isolée. La voie
    // déterministe devant rester pure, la requête fournit la réponse : les
    // autres produits ACTIFS portant le même Gencode.
    const eanPartagePar = produit.codeEan
      ? (
          await db.query.produits.findMany({
            where: and(
              eq(produits.codeEan, produit.codeEan),
              ne(produits.id, produit.id),
              isNull(produits.archiveLe)
            ),
            columns: { codePf: true },
          })
        ).map((p) => p.codePf)
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
        codePf: produit.codePf,
        typeTheFr: produit.typeTheFr,
        denominationFr: produit.denominationFr,
        estAromatise: produit.estAromatise,
        poidsNet: produit.poidsNet,
        codeOc: produit.codeOc,
        contientReglisse: produit.contientReglisse,
        allergenesMp: produit.allergenesMp,
        codeEan: produit.codeEan,
        eanPartagePar,
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
        pourcentageMasque: l.masquerPourcentageEtiquette,
        ordreTri: l.ordreTri,
      })),
    };
  }
);

/**
 * Input for the visual text robot: the validated fiche fields to look for on
 * the BAT, plus the product `codePf` used to locate its artwork in MinIO.
 * Returns null if the fiche or its product is missing.
 */
export const getBatTextInputForFiche = cache(
  async (
    ficheId: string
  ): Promise<{
    produitId: string;
    codePf: string;
    input: BatTextInput;
    /** Au moins un ingrédient certifié Demeter — pilote le contrôle §11.1. */
    estDemeter: boolean;
  } | null> => {
    const fiche = await db.query.fichesEtiquettes.findFirst({
      where: eq(fichesEtiquettes.id, ficheId),
    });
    if (!fiche) return null;

    const produit = await db.query.produits.findFirst({
      where: eq(produits.id, fiche.produitId),
    });
    if (!produit) return null;

    // La certification Demeter se lit sur les lignes de la recette, jamais sur
    // le produit : c'est un ingrédient qui la porte, et c'est elle qui impose le
    // gras italique du mot « demeter » sur l'étiquette (PRO-QHS-013 §11.1).
    // La recette COURANTE, au sens du reste de l'application : la plus récente
    // non archivée. Prendre « la première venue » faisait lire une version
    // remplacée — TA737 a deux brouillons qui ne s'accordent pas sur Demeter, et
    // l'audit tombait sur l'un ou l'autre selon l'ordre rendu par la base.
    const recette = await db.query.recettes.findFirst({
      where: and(eq(recettes.produitId, produit.id), ne(recettes.statut, "ARCHIVED")),
      orderBy: [desc(recettes.creeLe)],
    });
    const lignes = recette
      ? await db.query.ingredientsRecette.findMany({
          where: eq(ingredientsRecette.recetteId, recette.id),
        })
      : [];
    const estDemeter = lignes.some((i) => i.estDemeter);

    return {
      produitId: produit.id,
      codePf: produit.codePf,
      estDemeter,
      input: {
        denomination: produit.denominationFr ?? fiche.denominationLegale,
        ingredients: fiche.ingredientsFr,
        allegation: fiche.allegationsSanteFr ?? fiche.allegationChoisie,
        allergenes: fiche.allergenes,
        poidsNet: produit.poidsNet,
        codeEtiquette: fiche.codeEtiquette,
        mentionConservation: fiche.mentionConservation,
        mentionFabricant: fiche.mentionFabricant,
        phraseWfto: fiche.phraseWftoFr,
      },
    };
  }
);
