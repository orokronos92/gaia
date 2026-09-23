/**
 * The label links the packaging rules clean up (regles-bat.ts): read them with
 * what the rules need, and deactivate — never delete — the ones that break a
 * rule. A link a person set (origine MANUEL) is never read here.
 */
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, fichesEtiquettes, fichiersEtiquettes, produits } from "@/db/schema";

/** Active automatic label links, BATs and sources, with what the packaging rules need. */
export async function chargerLiensBatActifs() {
  return db
    .select({
      id: fichiersEtiquettes.id, produitId: fichiersEtiquettes.produitId, cleS3: fichiersEtiquettes.cleS3,
      nomFichier: fichiersEtiquettes.nomFichier, type: fichiersEtiquettes.type, codePf: produits.codePf,
      refFacing: fichesEtiquettes.refFacing, refContre: fichesEtiquettes.refContre,
    })
    .from(fichiersEtiquettes)
    .innerJoin(produits, eq(produits.id, fichiersEtiquettes.produitId))
    .leftJoin(fichesEtiquettes, eq(fichesEtiquettes.produitId, produits.id))
    .where(and(
      // Sources (.ai) were linked by folder in March like the BATs, and the fiche
      // shows them when a product has no BAT: the same rules apply to them.
      inArray(fichiersEtiquettes.type, ["BAT", "SOURCE"]), eq(fichiersEtiquettes.actif, true),
      eq(fichiersEtiquettes.origine, "AUTO"), isNull(produits.archiveLe),
    ));
}

export interface Desactivation {
  id: string;
  codePf: string;
  nomFichier: string;
  motif: string;
}

/** One transaction; the audit entry lists every link and its reason, so each can be reactivated. */
export async function desactiverLiens(desactivations: readonly Desactivation[], utilisateurId: string) {
  return db.transaction(async (tx) => {
    const ids = desactivations.map((d) => d.id);
    if (ids.length > 0) {
      await tx.update(fichiersEtiquettes).set({ actif: false, misAJourLe: new Date() }).where(inArray(fichiersEtiquettes.id, ids));
    }
    await tx.insert(auditLogs).values({
      typeEntite: "fichiers_etiquettes",
      entiteId: "nettoyage-regles-bat",
      action: "DESACTIVATION_BAT",
      utilisateurId,
      changements: { executePar: "scripts/nettoyer-liens-bat.ts", desactivations },
    });
    return ids.length;
  });
}
