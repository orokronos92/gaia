import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fichesEtiquettes } from "@/db/schema";

/**
 * Whitelist of fiche fields Marie may edit (editable-fiche phase 2). Anything
 * not listed here is rejected by the Server Action — no mass assignment.
 */
export const CHAMPS_FICHE_EDITABLES = [
  "texteCommercialFr",
  "ingredientsFr",
  "allergenes",
  "allegationsSanteFr",
  "phraseWftoFr",
  "mentionConservation",
  "mentionFabricant",
] as const;

export type ChampFicheEditable = (typeof CHAMPS_FICHE_EDITABLES)[number];

/**
 * Updates a whitelisted set of fiche text fields, returning the previous values
 * (for the audit diff). Caller (Server Action) guarantees the keys are allowed.
 */
export async function updateFicheEtiquetteChamps(
  ficheId: string,
  champs: Partial<Record<ChampFicheEditable, string | null>>
): Promise<{ avant: Record<string, string | null> }> {
  const before = await db.query.fichesEtiquettes.findFirst({
    where: eq(fichesEtiquettes.id, ficheId),
  });
  if (!before) {
    throw new Error("Fiche introuvable");
  }

  await db
    .update(fichesEtiquettes)
    .set({ ...champs, misAJourLe: new Date() })
    .where(eq(fichesEtiquettes.id, ficheId));

  const avant = Object.fromEntries(
    Object.keys(champs).map((k) => [k, (before as Record<string, unknown>)[k] as string | null ?? null])
  );
  return { avant };
}

export interface SetAllegationParams {
  ficheId: string;
  allegationChoisie: string;
  nbTassesAllegation: string | null;
}

/**
 * Persists Marie's chosen health claim on a fiche, returning the previous value
 * (for the audit diff). The selection then surfaces in « Données complémentaires ».
 */
export async function setAllegationChoisie({
  ficheId,
  allegationChoisie,
  nbTassesAllegation,
}: SetAllegationParams): Promise<{
  avant: { allegationChoisie: string | null; nbTassesAllegation: string | null };
}> {
  const before = await db.query.fichesEtiquettes.findFirst({
    where: eq(fichesEtiquettes.id, ficheId),
    columns: { allegationChoisie: true, nbTassesAllegation: true },
  });
  if (!before) {
    throw new Error("Fiche introuvable");
  }

  await db
    .update(fichesEtiquettes)
    .set({ allegationChoisie, nbTassesAllegation, misAJourLe: new Date() })
    .where(eq(fichesEtiquettes.id, ficheId));

  return { avant: before };
}
