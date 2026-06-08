import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fichesEtiquettes } from "@/db/schema";

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
