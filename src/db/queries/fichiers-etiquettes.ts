import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { fichiersEtiquettes } from "@/db/schema";

export type FichierEtiquette = typeof fichiersEtiquettes.$inferSelect;

/** A file to associate, as resolved from the bucket. */
export interface AssociationFichier {
    cleS3: string;
    dossier: string;
    nomFichier: string;
    type: FichierEtiquette["type"];
    version: string | null;
}

/** Every file linked to a product, sources included, oldest folder first. */
export async function getFichiersProduit(produitId: string): Promise<FichierEtiquette[]> {
    return db
        .select()
        .from(fichiersEtiquettes)
        .where(eq(fichiersEtiquettes.produitId, produitId))
        .orderBy(asc(fichiersEtiquettes.dossier), asc(fichiersEtiquettes.nomFichier));
}

/**
 * The BAT files an audit should read: type BAT and still active. An obsolete
 * version stays in the table — deactivated, not deleted — so the fiche keeps its
 * history while the audit only ever sees what is in force.
 */
export async function getBatsActifsProduit(produitId: string): Promise<FichierEtiquette[]> {
    return db
        .select()
        .from(fichiersEtiquettes)
        .where(
            and(
                eq(fichiersEtiquettes.produitId, produitId),
                eq(fichiersEtiquettes.type, "BAT"),
                eq(fichiersEtiquettes.actif, true)
            )
        )
        .orderBy(asc(fichiersEtiquettes.nomFichier));
}

/**
 * Replaces a product's automatically-resolved links with a freshly computed set.
 *
 * Rows whose `origine` is MANUEL are left untouched: a human decision outranks
 * the naming rule and must survive every re-run. Runs in a transaction so a
 * product is never left with its old links deleted and the new ones missing.
 */
export async function remplacerAssociationsAuto(
    produitId: string,
    fichiers: AssociationFichier[]
): Promise<{ inseres: number; conserves: number }> {
    return db.transaction(async (tx) => {
        const existants = await tx
            .select()
            .from(fichiersEtiquettes)
            .where(eq(fichiersEtiquettes.produitId, produitId));

        const manuels = existants.filter((f) => f.origine === "MANUEL");
        const aSupprimer = existants.filter((f) => f.origine === "AUTO").map((f) => f.id);

        if (aSupprimer.length > 0) {
            await tx.delete(fichiersEtiquettes).where(inArray(fichiersEtiquettes.id, aSupprimer));
        }

        // A key claimed manually — possibly by another product — is never re-taken.
        const clesManuelles = new Set(manuels.map((f) => f.cleS3));
        const aInserer = fichiers.filter((f) => !clesManuelles.has(f.cleS3));

        if (aInserer.length > 0) {
            await tx
                .insert(fichiersEtiquettes)
                .values(aInserer.map((f) => ({ ...f, produitId, origine: "AUTO" as const })))
                .onConflictDoNothing({
                    target: [fichiersEtiquettes.produitId, fichiersEtiquettes.cleS3],
                });
        }

        return { inseres: aInserer.length, conserves: manuels.length };
    });
}
