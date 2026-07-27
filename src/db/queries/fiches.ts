import { cache } from "react";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  fichesEtiquettes,
  produits,
  recettes,
  ingredientsRecette,
  versionsEtiquettes,
  fichesDegustation,
  utilisateurs,
  StatutEtiquette,
} from "@/db/schema";

/** Workflow status union, derived from the Drizzle enum (single source of truth). */
export type StatutFiche = (typeof StatutEtiquette.enumValues)[number];

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
 * Aligns the fiche's declared ingredient list with a validated recette (Lot 5):
 * the produit's declared composition becomes the recette truth, which also
 * closes the composition differential.
 */
export async function alignerListeIngredients(ficheId: string, ingredientsFr: string): Promise<void> {
  await db
    .update(fichesEtiquettes)
    .set({ ingredientsFr, misAJourLe: new Date() })
    .where(eq(fichesEtiquettes.id, ficheId));
}

/** Resolves a fiche's product id server-side (never trust a client-sent id). */
export const getFicheProduitId = cache(async (ficheId: string): Promise<string | null> => {
  const fiche = await db.query.fichesEtiquettes.findFirst({
    where: eq(fichesEtiquettes.id, ficheId),
    columns: { produitId: true },
  });
  return fiche?.produitId ?? null;
});

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

/**
 * Persists Marie's manual workflow status change on a fiche, returning the
 * previous value (for the audit diff). No transition logic yet — Marie sets it
 * freely; a workflow engine may come later.
 */
export async function updateStatutFiche(
  ficheId: string,
  statut: StatutFiche
): Promise<{ avant: StatutFiche | null }> {
  const before = await db.query.fichesEtiquettes.findFirst({
    where: eq(fichesEtiquettes.id, ficheId),
    columns: { statut: true },
  });
  if (!before) {
    throw new Error("Fiche introuvable");
  }

  await db
    .update(fichesEtiquettes)
    .set({ statut, misAJourLe: new Date() })
    .where(eq(fichesEtiquettes.id, ficheId));

  return { avant: before.statut };
}

/**
 * Duplicates a fiche into a BRAND-NEW product + fiche (editable-fiche). Clones
 * the produit (new codePf, new title), the fiche, and the latest recette QUID
 * with its ingredients — as a starting point for Marie. The source is untouched.
 * Dégustation, audits and version history are NOT copied. Multi-table → one
 * transaction (CLAUDE.md §6).
 */
export async function dupliquerFiche(params: {
  ficheId: string;
  nouveauTitre: string;
}): Promise<{ nouvelleFicheId: string; nouveauProduitId: string }> {
  return db.transaction(async (tx) => {
    const fiche = await tx.query.fichesEtiquettes.findFirst({
      where: eq(fichesEtiquettes.id, params.ficheId),
    });
    if (!fiche) throw new Error("Fiche introuvable");

    const produit = await tx.query.produits.findFirst({
      where: eq(produits.id, fiche.produitId),
    });
    if (!produit) throw new Error("Produit introuvable");

    // 1. New product (unique codePf, new title).
    const { id: _pid, creeLe: _pc, misAJourLe: _pm, ...produitRest } = produit;
    const suffixe = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296)
      .toString(36)
      .padStart(2, "0")}`;
    const nouveauCodePf = `${produit.codePf}-C${suffixe}`.slice(0, 50);
    const [nouveauProduit] = await tx
      .insert(produits)
      .values({ ...produitRest, codePf: nouveauCodePf, denominationFr: params.nouveauTitre })
      .returning({ id: produits.id });

    // 2. New fiche (fresh: no unique code, DRAFT, no version pointer).
    const {
      id: _fid,
      produitId: _fp,
      codeEtiquette: _fc,
      versionCouranteId: _fv,
      creeLe: _fcr,
      misAJourLe: _fmu,
      ...ficheRest
    } = fiche;
    const [nouvelleFiche] = await tx
      .insert(fichesEtiquettes)
      .values({
        ...ficheRest,
        produitId: nouveauProduit.id,
        codeEtiquette: null,
        versionCouranteId: null,
        statut: "DRAFT",
      })
      .returning({ id: fichesEtiquettes.id });

    // 3. Latest recette QUID + its ingredients.
    const recette = await tx.query.recettes.findFirst({
      where: eq(recettes.produitId, produit.id),
      orderBy: [desc(recettes.creeLe)],
    });
    if (recette) {
      const { id: _rid, produitId: _rp, creeLe: _rc, misAJourLe: _rm, ...recetteRest } = recette;
      const [nouvelleRecette] = await tx
        .insert(recettes)
        .values({ ...recetteRest, produitId: nouveauProduit.id, statut: "DRAFT" })
        .returning({ id: recettes.id });

      const ings = await tx.query.ingredientsRecette.findMany({
        where: eq(ingredientsRecette.recetteId, recette.id),
      });
      if (ings.length > 0) {
        await tx.insert(ingredientsRecette).values(
          ings.map(({ id: _iid, recetteId: _irid, ...ingRest }) => ({
            ...ingRest,
            recetteId: nouvelleRecette.id,
          }))
        );
      }
    }

    // 4. Latest dégustation (organoleptic grid), copied to the new product.
    const degustation = await tx.query.fichesDegustation.findFirst({
      where: eq(fichesDegustation.produitId, produit.id),
      orderBy: [desc(fichesDegustation.creeLe)],
    });
    if (degustation) {
      const { id: _did, produitId: _dp, creeLe: _dc, ...degRest } = degustation;
      await tx
        .insert(fichesDegustation)
        .values({ ...degRest, produitId: nouveauProduit.id });
    }

    return {
      nouvelleFicheId: nouvelleFiche.id,
      nouveauProduitId: nouveauProduit.id,
    };
  });
}

/**
 * Saves the current state of a fiche as a new version snapshot (Phase 3 start).
 * Per-card edits already persist; this is the "Sauvegarder" that records a point
 * in time (history / legislation changes), incrementing the version number and
 * snapshotting the fiche + produit. Multi-table read + write → one transaction.
 */
export async function creerVersionFiche(params: {
  ficheId: string;
  utilisateurId: string;
  resume?: string | null;
}): Promise<{ versionId: string; numeroVersion: number }> {
  return db.transaction(async (tx) => {
    const fiche = await tx.query.fichesEtiquettes.findFirst({
      where: eq(fichesEtiquettes.id, params.ficheId),
    });
    if (!fiche) throw new Error("Fiche introuvable");
    const produit = await tx.query.produits.findFirst({
      where: eq(produits.id, fiche.produitId),
    });

    // Broaden the snapshot: latest recette QUID (+ ingredients) and dégustation.
    const recette = await tx.query.recettes.findFirst({
      where: eq(recettes.produitId, fiche.produitId),
      orderBy: [desc(recettes.creeLe)],
    });
    let recetteSnap: unknown = null;
    if (recette) {
      const ingredients = await tx.query.ingredientsRecette.findMany({
        where: eq(ingredientsRecette.recetteId, recette.id),
        orderBy: [ingredientsRecette.ordreTri],
      });
      recetteSnap = { ...recette, ingredients };
    }
    const degustation = await tx.query.fichesDegustation.findFirst({
      where: eq(fichesDegustation.produitId, fiche.produitId),
      orderBy: [desc(fichesDegustation.creeLe)],
    });

    const [agg] = await tx
      .select({
        max: sql<number>`coalesce(max(${versionsEtiquettes.numeroVersion}), 0)`,
      })
      .from(versionsEtiquettes)
      .where(eq(versionsEtiquettes.ficheEtiquetteId, params.ficheId));
    const numeroVersion = (agg?.max ?? 0) + 1;

    const [version] = await tx
      .insert(versionsEtiquettes)
      .values({
        ficheEtiquetteId: params.ficheId,
        numeroVersion,
        donneesSnapshot: {
          fiche,
          produit,
          recette: recetteSnap,
          degustation: degustation ?? null,
        },
        statut: fiche.statut,
        creePar: params.utilisateurId,
        resumeChangements: params.resume ?? null,
      })
      .returning({ id: versionsEtiquettes.id });

    await tx
      .update(fichesEtiquettes)
      .set({ versionCouranteId: version.id, misAJourLe: new Date() })
      .where(eq(fichesEtiquettes.id, params.ficheId));

    return { versionId: version.id, numeroVersion };
  });
}

export interface VersionResume {
  id: string;
  numeroVersion: number;
  creeLe: Date;
  statut: string;
  resumeChangements: string | null;
  auteur: string | null;
  donneesSnapshot: unknown;
}

/** Lists a fiche's version snapshots (newest first), with the author name. */
export const getVersionsFiche = cache(
  async (ficheId: string): Promise<VersionResume[]> => {
    return db
      .select({
        id: versionsEtiquettes.id,
        numeroVersion: versionsEtiquettes.numeroVersion,
        creeLe: versionsEtiquettes.creeLe,
        statut: versionsEtiquettes.statut,
        resumeChangements: versionsEtiquettes.resumeChangements,
        auteur: utilisateurs.nom,
        donneesSnapshot: versionsEtiquettes.donneesSnapshot,
      })
      .from(versionsEtiquettes)
      .leftJoin(utilisateurs, eq(versionsEtiquettes.creePar, utilisateurs.id))
      .where(eq(versionsEtiquettes.ficheEtiquetteId, ficheId))
      .orderBy(desc(versionsEtiquettes.numeroVersion));
  }
);

/**
 * After a restore, the content is back to a past state that has NOT been
 * re-checked, so the fiche is sent back for quality review — never left as a
 * stale "validated" (regulatory: a validated status must reflect a controlled
 * state).
 */
const STATUT_APRES_RESTAURATION: StatutFiche = "QUALITY_REVIEW";

/**
 * Minimal shape guard on the version snapshot before it is spread into four
 * table writes. A malformed / hand-edited / legacy-shaped blob fails fast with a
 * clear error instead of an opaque Drizzle runtime error mid-transaction. Each
 * branch is validated only as "an object" — column-level types are still the
 * schema's responsibility.
 */
const SnapshotBranche = z.record(z.string(), z.unknown());
const DonneesSnapshotSchema = z.object({
  fiche: SnapshotBranche.optional(),
  produit: SnapshotBranche.nullish(),
  recette: SnapshotBranche.nullish(),
  degustation: SnapshotBranche.nullish(),
});

/**
 * Restores a version's snapshot into the LIVE record. The model is 1 produit =
 * 1 fiche, so a full restore rewrites the four branches captured in the
 * snapshot — the fiche (label content), the produit (identity/sourcing), the
 * recette QUID + its ingredient lines (the % / kg the audit relies on), and the
 * dégustation (organoleptic grid the fiche evolves from) — in one transaction.
 * Business keys (codePf, codeEtiquette) and creation timestamps are kept, and
 * the fiche is sent back to QUALITY_REVIEW (see STATUT_APRES_RESTAURATION).
 * Snapshots predating a branch simply skip it (backward-compatible). The current
 * state should have been saved as a version first if Marie wants to keep it.
 */
export async function restaurerVersionFiche(
  versionId: string
): Promise<{ ficheId: string; numeroVersion: number }> {
  return db.transaction(async (tx) => {
    const version = await tx.query.versionsEtiquettes.findFirst({
      where: eq(versionsEtiquettes.id, versionId),
    });
    if (!version) throw new Error("Version introuvable");

    const snap = DonneesSnapshotSchema.parse(version.donneesSnapshot);

    // The live fiche is the authoritative target (its produitId may not be echoed
    // faithfully by an old snapshot).
    const ficheLive = await tx.query.fichesEtiquettes.findFirst({
      where: eq(fichesEtiquettes.id, version.ficheEtiquetteId),
    });
    if (!ficheLive) throw new Error("Fiche introuvable");

    // 1. Fiche — restore the label-content fields (drop identity/timestamp keys).
    //    statut is NOT restored: a restore sends the fiche back for re-checking.
    const fiche = snap.fiche ?? {};
    const {
      id: _id,
      produitId: _pid,
      codeEtiquette: _ce,
      versionCouranteId: _vc,
      creePar: _cp,
      creeLe: _cl,
      misAJourLe: _mu,
      statut: _st,
      ...ficheContenu
    } = fiche;
    await tx
      .update(fichesEtiquettes)
      .set({
        ...(ficheContenu as Record<string, unknown>),
        statut: STATUT_APRES_RESTAURATION,
        misAJourLe: new Date(),
      })
      .where(eq(fichesEtiquettes.id, version.ficheEtiquetteId));

    // 2. Produit — restore identity/sourcing; keep the business key (codePf) and
    //    creation timestamp. produits has no timestamp columns other than these.
    if (snap.produit) {
      const {
        id: _prodId,
        codePf: _cpf,
        creeLe: _pcl,
        misAJourLe: _pmu,
        ...produitContenu
      } = snap.produit;
      await tx
        .update(produits)
        .set({ ...(produitContenu as Record<string, unknown>), misAJourLe: new Date() })
        .where(eq(produits.id, ficheLive.produitId));
    }

    // 3. Recette QUID + ingredients — overwrite the live recette in place (or
    //    recreate it if none exists), then replace its ingredient lines.
    if (snap.recette) {
      const { ingredients: snapIngredients, ...recetteSnap } = snap.recette;
      const {
        id: _rid,
        produitId: _rpid,
        creeLe: _rcl,
        misAJourLe: _rmu,
        date: rawDate,
        ...recetteContenu
      } = recetteSnap;
      // JSON serialises the `date` timestamp to a string → coerce back to Date.
      const recetteDate = rawDate ? new Date(rawDate as string) : null;

      const recetteLive = await tx.query.recettes.findFirst({
        where: eq(recettes.produitId, ficheLive.produitId),
        orderBy: [desc(recettes.creeLe)],
      });

      let recetteCibleId: string;
      if (recetteLive) {
        await tx
          .update(recettes)
          .set({
            ...(recetteContenu as Record<string, unknown>),
            date: recetteDate,
            misAJourLe: new Date(),
          })
          .where(eq(recettes.id, recetteLive.id));
        recetteCibleId = recetteLive.id;
      } else {
        const [nouvelle] = await tx
          .insert(recettes)
          .values({
            ...(recetteContenu as Record<string, unknown>),
            date: recetteDate,
            produitId: ficheLive.produitId,
          } as typeof recettes.$inferInsert)
          .returning({ id: recettes.id });
        recetteCibleId = nouvelle.id;
      }

      // Only touch ingredient lines when the snapshot actually carries them
      // (an empty array means "no ingredients at that time" → clear them).
      if (Array.isArray(snapIngredients)) {
        const lignes = snapIngredients as Record<string, unknown>[];
        await tx
          .delete(ingredientsRecette)
          .where(eq(ingredientsRecette.recetteId, recetteCibleId));
        if (lignes.length > 0) {
          await tx.insert(ingredientsRecette).values(
            lignes.map((ing) => {
              const { id: _iid, recetteId: _irid, ...ingRest } = ing;
              return {
                ...(ingRest as Record<string, unknown>),
                recetteId: recetteCibleId,
              } as typeof ingredientsRecette.$inferInsert;
            })
          );
        }
      }
    }

    // 4. Dégustation — the organoleptic grid the fiche evolves from. Overwrite
    //    the live one in place (or insert if none). No child tables; creeLe is
    //    the only timestamp column, kept as-is.
    if (snap.degustation) {
      const {
        id: _did,
        produitId: _dpid,
        creeLe: _dcl,
        ...degContenu
      } = snap.degustation;
      const degLive = await tx.query.fichesDegustation.findFirst({
        where: eq(fichesDegustation.produitId, ficheLive.produitId),
        orderBy: [desc(fichesDegustation.creeLe)],
      });
      if (degLive) {
        await tx
          .update(fichesDegustation)
          .set({ ...(degContenu as Record<string, unknown>) })
          .where(eq(fichesDegustation.id, degLive.id));
      } else {
        await tx
          .insert(fichesDegustation)
          .values({
            ...(degContenu as Record<string, unknown>),
            produitId: ficheLive.produitId,
          } as typeof fichesDegustation.$inferInsert);
      }
    }

    return {
      ficheId: version.ficheEtiquetteId,
      numeroVersion: version.numeroVersion,
    };
  });
}

/** Reads a single version's snapshot (server-side, for re-auditing it). */
export const getVersionSnapshot = cache(
  async (
    versionId: string
  ): Promise<{ fiche?: Record<string, unknown>; produit?: Record<string, unknown> } | null> => {
    const v = await db.query.versionsEtiquettes.findFirst({
      where: eq(versionsEtiquettes.id, versionId),
      columns: { donneesSnapshot: true },
    });
    return (v?.donneesSnapshot ?? null) as
      | { fiche?: Record<string, unknown>; produit?: Record<string, unknown> }
      | null;
  }
);

/**
 * Mixed-table save for the "Données complémentaires" card (editable-fiche étape 2):
 * writes produit + fiche fields and upserts the dégustation, all in one
 * transaction. Values are already coerced/whitelisted by the Server Action.
 */
export async function updateDossier(params: {
  ficheId: string;
  produitId: string;
  degustationId?: string | null;
  produit: Record<string, unknown>;
  fiche: Record<string, unknown>;
  degustation: Record<string, unknown>;
}): Promise<{ degustationId: string | null }> {
  return db.transaction(async (tx) => {
    if (Object.keys(params.produit).length > 0) {
      await tx
        .update(produits)
        .set({ ...(params.produit as Record<string, never>), misAJourLe: new Date() })
        .where(eq(produits.id, params.produitId));
    }
    if (Object.keys(params.fiche).length > 0) {
      await tx
        .update(fichesEtiquettes)
        .set({ ...(params.fiche as Record<string, never>), misAJourLe: new Date() })
        .where(eq(fichesEtiquettes.id, params.ficheId));
    }

    let degId = params.degustationId ?? null;
    if (Object.keys(params.degustation).length > 0) {
      const cible = params.degustationId
        ? await tx.query.fichesDegustation.findFirst({
            where: eq(fichesDegustation.id, params.degustationId),
          })
        : await tx.query.fichesDegustation.findFirst({
            where: eq(fichesDegustation.produitId, params.produitId),
            orderBy: [desc(fichesDegustation.creeLe)],
          });
      if (cible) {
        await tx
          .update(fichesDegustation)
          .set({ ...(params.degustation as Record<string, never>) })
          .where(eq(fichesDegustation.id, cible.id));
        degId = cible.id;
      } else {
        const [cree] = await tx
          .insert(fichesDegustation)
          .values({ produitId: params.produitId, ...(params.degustation as Record<string, never>) })
          .returning({ id: fichesDegustation.id });
        degId = cree.id;
      }
    }

    return { degustationId: degId };
  });
}
