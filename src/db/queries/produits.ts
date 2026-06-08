import { eq } from "drizzle-orm";
import { db } from "@/db";
import { produits } from "@/db/schema";

/**
 * Whitelist of produit fields Marie may edit (editable-fiche pattern). Grows as
 * cards get wired (Identité…). The title (`denominationFr`) is the first.
 */
export const CHAMPS_PRODUIT_EDITABLES = ["denominationFr"] as const;

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

  await db
    .update(produits)
    .set({ ...champs, misAJourLe: new Date() })
    .where(eq(produits.id, produitId));

  const avant = Object.fromEntries(
    Object.keys(champs).map((k) => [k, (before as Record<string, unknown>)[k] as string | null ?? null])
  );
  return { avant };
}
