import { cache } from "react";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { utilisateurs, validationsControle } from "@/db/schema";
import type { Decision, ValidationControle } from "@/lib/audit/validation";

/** Les décisions portées par la Qualité sur une fiche. */
export const getValidationsFiche = cache(
  async (ficheId: string): Promise<ValidationControle[]> => {
    const lignes = await db
      .select({
        pointId: validationsControle.pointId,
        decision: validationsControle.decision,
        justification: validationsControle.justification,
        empreinte: validationsControle.empreinte,
        valideLe: validationsControle.valideLe,
        nom: utilisateurs.nom,
        email: utilisateurs.email,
      })
      .from(validationsControle)
      .innerJoin(utilisateurs, eq(utilisateurs.id, validationsControle.valideParId))
      .where(eq(validationsControle.ficheEtiquetteId, ficheId));

    return lignes.map((l) => ({
      pointId: l.pointId,
      decision: l.decision,
      justification: l.justification,
      empreinte: l.empreinte,
      valideParNom: l.nom ?? l.email,
      valideLe: l.valideLe,
    }));
  }
);

/**
 * Enregistre une décision, ou la remplace si le point en portait déjà une.
 *
 * Une seule décision vit par point : reposer une coche sur un constat qui a
 * changé écrase la précédente. L'historique n'est pas perdu pour autant — il
 * est écrit dans `audit_logs`, qui est déjà la piste d'audit du client.
 */
export async function poserValidation(params: {
  ficheId: string;
  pointId: string;
  decision: Decision;
  justification: string | null;
  empreinte: string;
  utilisateurId: string;
}): Promise<void> {
  await db
    .insert(validationsControle)
    .values({
      ficheEtiquetteId: params.ficheId,
      pointId: params.pointId,
      decision: params.decision,
      justification: params.justification,
      empreinte: params.empreinte,
      valideParId: params.utilisateurId,
    })
    .onConflictDoUpdate({
      target: [validationsControle.ficheEtiquetteId, validationsControle.pointId],
      set: {
        decision: params.decision,
        justification: params.justification,
        empreinte: params.empreinte,
        valideParId: params.utilisateurId,
        valideLe: new Date(),
      },
    });
}

/** Retire la décision portée sur un point. */
export async function retirerValidation(ficheId: string, pointId: string): Promise<void> {
  await db
    .delete(validationsControle)
    .where(
      and(
        eq(validationsControle.ficheEtiquetteId, ficheId),
        eq(validationsControle.pointId, pointId)
      )
    );
}
