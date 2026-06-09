import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { fichesDegustation } from "@/db/schema";

/** Whitelist of organoleptic-grid text fields Marie may edit (editable-fiche). */
export const CHAMPS_DEGUSTATION_EDITABLES = [
  "dateDegustation",
  "numeroDeLot",
  "momentDegustation",
  "poidsInfuse",
  "temperatureDegustation",
  "tempsDegustation",
  "feuillesSechesAspect",
  "feuillesSechesCouleur",
  "feuillesSechesSenteur",
  "feuillesInfuseesAspect",
  "feuillesInfuseesCouleur",
  "feuillesInfuseesSenteur",
  "infusionAspectCouleur",
  "infusionParfum",
  "saveurBouche",
] as const;

export type ChampDegustationEditable = (typeof CHAMPS_DEGUSTATION_EDITABLES)[number];

/**
 * Upserts the organoleptic grid: updates the latest dégustation of the product
 * (or the one identified by `degustationId`), or CREATES one if none exists —
 * a product may have no dégustation yet. Returns the previous values (audit diff)
 * and the row id.
 */
export async function upsertDegustationChamps(params: {
  produitId: string;
  degustationId?: string | null;
  champs: Partial<Record<ChampDegustationEditable, string | null>>;
}): Promise<{ avant: Record<string, string | null>; degustationId: string }> {
  const cible = params.degustationId
    ? await db.query.fichesDegustation.findFirst({
        where: eq(fichesDegustation.id, params.degustationId),
      })
    : await db.query.fichesDegustation.findFirst({
        where: eq(fichesDegustation.produitId, params.produitId),
        orderBy: [desc(fichesDegustation.creeLe)],
      });

  if (cible) {
    await db
      .update(fichesDegustation)
      .set({ ...params.champs })
      .where(eq(fichesDegustation.id, cible.id));
    const avant = Object.fromEntries(
      Object.keys(params.champs).map((k) => [
        k,
        ((cible as Record<string, unknown>)[k] as string | null) ?? null,
      ])
    );
    return { avant, degustationId: cible.id };
  }

  const [cree] = await db
    .insert(fichesDegustation)
    .values({ produitId: params.produitId, ...params.champs })
    .returning({ id: fichesDegustation.id });
  return { avant: {}, degustationId: cree.id };
}
