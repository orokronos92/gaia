import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { utilisateurs } from "@/db/schema";

/** Names keyed by id, for screens that display "who did this". */
export async function getUtilisateursParId(ids: string[]): Promise<Record<string, string>> {
  const uniques = [...new Set(ids)];
  if (uniques.length === 0) return {};

  const lignes = await db
    .select({ id: utilisateurs.id, nom: utilisateurs.nom })
    .from(utilisateurs)
    .where(inArray(utilisateurs.id, uniques));

  return Object.fromEntries(lignes.map((l) => [l.id, l.nom]));
}
