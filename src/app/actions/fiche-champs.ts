"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  CHAMPS_FICHE_EDITABLES,
  updateFicheEtiquetteChamps,
  type ChampFicheEditable,
} from "@/db/queries/fiches";
import { writeAuditLog } from "@/db/queries/audit-logs";

const Schema = z.object({
  ficheId: z.string().uuid(),
  champs: z.record(z.string(), z.string().nullable()),
});

const AUTORISES = new Set<string>(CHAMPS_FICHE_EDITABLES);

/**
 * Saves a per-card edit of fiche text fields (editable-fiche phase 2). The
 * canonical pattern: auth → Zod → whitelist filter (no mass assignment) →
 * delegate to the queries layer → audit-log the diff → revalidate. Empty strings
 * are normalised to null so a cleared field falls back to its default display.
 */
export async function updateFicheChampsAction(input: unknown) {
  const data = Schema.parse(input);

  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const champs: Partial<Record<ChampFicheEditable, string | null>> = {};
  for (const [k, v] of Object.entries(data.champs)) {
    if (!AUTORISES.has(k)) continue;
    champs[k as ChampFicheEditable] = v && v.trim() !== "" ? v : null;
  }
  if (Object.keys(champs).length === 0) {
    throw new Error("Aucun champ modifiable fourni.");
  }

  const { avant } = await updateFicheEtiquetteChamps(data.ficheId, champs);

  await writeAuditLog({
    typeEntite: "fiche_etiquette",
    entiteId: data.ficheId,
    action: "CHAMPS_MODIFIES",
    utilisateurId: session.user.id,
    changements: { avant, apres: champs },
  });

  revalidatePath(`/etiquettes/${data.ficheId}`);
  return { ok: true as const };
}
