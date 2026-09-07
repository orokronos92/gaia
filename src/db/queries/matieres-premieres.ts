import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { matieresPremieres } from "@/db/schema";

export type MatierePremiere = typeof matieresPremieres.$inferSelect;

/** The whole reference, unqualified materials first — those are the work list. */
export async function getMatieresPremieres(): Promise<MatierePremiere[]> {
    const lignes = await db
        .select()
        .from(matieresPremieres)
        .orderBy(asc(matieresPremieres.codeArticle));

    return [
        ...lignes.filter((l) => !l.denominationLegale),
        ...lignes.filter((l) => l.denominationLegale),
    ];
}

export interface QualifierParams {
    codeArticle: string;
    denominationLegale: string;
    estBio: boolean;
    estDemeter: boolean;
    estEquitable: boolean;
    utilisateurId: string;
}

/**
 * Records a human's answer for one raw material. Imports never overwrite this —
 * `alimenterMatieresPremieres` only inserts rows that do not exist yet.
 */
export async function qualifierMatiere(params: QualifierParams): Promise<void> {
    await db
        .update(matieresPremieres)
        .set({
            denominationLegale: params.denominationLegale.trim().slice(0, 255),
            estBio: params.estBio,
            estDemeter: params.estDemeter,
            estEquitable: params.estEquitable,
            qualifiePar: params.utilisateurId,
            qualifieLe: new Date(),
            misAJourLe: new Date(),
        })
        .where(eq(matieresPremieres.codeArticle, params.codeArticle));
}
