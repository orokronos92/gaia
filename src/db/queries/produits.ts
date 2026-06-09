import { cache } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { produits, fichesEtiquettes } from "@/db/schema";

/**
 * Resolves an existing product (and its latest fiche) by codePf — used to detect
 * an import conflict before silently overwriting (codePf is the unique identity).
 * Returns null when the code is free.
 */
export const getFicheExistantePourCodePf = cache(
  async (codePf: string): Promise<{ produitId: string; ficheId: string | null } | null> => {
    const produit = await db.query.produits.findFirst({
      where: eq(produits.codePf, codePf),
      columns: { id: true },
    });
    if (!produit) return null;
    const fiche = await db.query.fichesEtiquettes.findFirst({
      where: eq(fichesEtiquettes.produitId, produit.id),
      columns: { id: true },
      orderBy: [desc(fichesEtiquettes.creeLe)],
    });
    return { produitId: produit.id, ficheId: fiche?.id ?? null };
  }
);

/**
 * Whitelist of produit fields Marie may edit (editable-fiche pattern). Grows as
 * cards get wired (Identité…). The title (`denominationFr`) is the first.
 */
export const CHAMPS_PRODUIT_EDITABLES = [
  "codePf", // model code — the authoritative product identity (replaces the IMP-… placeholder)
  "denominationFr",
  "typeTheFr",
  "origine",
  "conditionnement",
  "poidsNet",
  "tempsInfusion",
  "tempInfusion",
  "nbTasses",
  "sousDesignationFr",
] as const;

export type ChampProduitEditable = (typeof CHAMPS_PRODUIT_EDITABLES)[number];

/**
 * Updates a whitelisted set of produit fields, returning the previous values
 * (for the audit diff). Caller (Server Action) guarantees the keys are allowed.
 * Note: editing a produit field affects EVERY fiche of that product.
 */
export async function updateProduitChamps(
  produitId: string,
  champs: Partial<Record<ChampProduitEditable, string>>
): Promise<{ avant: Record<string, string | null> }> {
  const before = await db.query.produits.findFirst({
    where: eq(produits.id, produitId),
  });
  if (!before) {
    throw new Error("Produit introuvable");
  }

  try {
    await db
      .update(produits)
      .set({ ...champs, misAJourLe: new Date() })
      .where(eq(produits.id, produitId));
  } catch (e) {
    // codePf is UNIQUE — surface a readable message instead of the raw PG error.
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "23505") {
      throw new Error("Ce code modèle est déjà utilisé par un autre produit.");
    }
    throw e;
  }

  const avant = Object.fromEntries(
    Object.keys(champs).map((k) => [k, (before as Record<string, unknown>)[k] as string | null ?? null])
  );
  return { avant };
}
