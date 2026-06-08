"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { CHAMPS_FICHE_EDITABLES, updateFicheEtiquetteChamps } from "@/db/queries/fiches";
import { CHAMPS_PRODUIT_EDITABLES, updateProduitChamps } from "@/db/queries/produits";
import { writeAuditLog } from "@/db/queries/audit-logs";

const Schema = z.object({
  table: z.enum(["fiche", "produit"]),
  /** Row to update — ficheId for "fiche", produitId for "produit". */
  id: z.string().uuid(),
  /** Fiche whose page to revalidate. */
  ficheId: z.string().uuid(),
  champs: z.record(z.string(), z.string().nullable()),
});

const WHITELIST: Record<"fiche" | "produit", Set<string>> = {
  fiche: new Set(CHAMPS_FICHE_EDITABLES),
  produit: new Set(CHAMPS_PRODUIT_EDITABLES),
};

/**
 * Saves a per-card edit of fiche OR produit text fields (editable-fiche pattern).
 * auth → Zod → per-table whitelist (no mass assignment) → query delegation →
 * audit-log the diff → revalidate. Fiche fields: "" → null (all nullable).
 * Produit fields: kept as string (some are NOT NULL); the title can't be emptied.
 */
export async function updateChampsAction(input: unknown) {
  const data = Schema.parse(input);

  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const allowed = WHITELIST[data.table];
  const champs: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(data.champs)) {
    if (!allowed.has(k)) continue;
    if (data.table === "fiche") {
      champs[k] = v && v.trim() !== "" ? v : null;
    } else {
      const val = (v ?? "").trim();
      if (k === "denominationFr" && val === "") {
        throw new Error("Le titre ne peut pas être vide.");
      }
      champs[k] = val;
    }
  }
  if (Object.keys(champs).length === 0) {
    throw new Error("Aucun champ modifiable fourni.");
  }

  const { avant } =
    data.table === "fiche"
      ? await updateFicheEtiquetteChamps(data.id, champs)
      : await updateProduitChamps(data.id, champs as Record<"denominationFr", string>);

  await writeAuditLog({
    typeEntite: data.table === "fiche" ? "fiche_etiquette" : "produit",
    entiteId: data.id,
    action: "CHAMPS_MODIFIES",
    utilisateurId: session.user.id,
    changements: { table: data.table, avant, apres: champs },
  });

  revalidatePath(`/etiquettes/${data.ficheId}`);
  return { ok: true as const };
}
