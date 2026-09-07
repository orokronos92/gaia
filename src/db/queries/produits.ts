import { cache } from "react";
import { and, count, desc, eq, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { produits, fichesEtiquettes } from "@/db/schema";

/**
 * Resolves an existing product (and its latest fiche) by codePf — used to detect
 * an import conflict before silently overwriting (codePf is the unique identity).
 * Returns null when the code is free.
 */
export const getFicheExistantePourCodePf = cache(
  async (codePf: string): Promise<{ produitId: string; ficheId: string | null } | null> => {
    // Archived products do not hold their code any more: the point of archiving
    // is that Marie can start the same reference over, cleanly.
    const produit = await db.query.produits.findFirst({
      where: and(eq(produits.codePf, codePf), isNull(produits.archiveLe)),
      columns: { id: true },
    });
    if (!produit) return null;
    const fiche = await db.query.fichesEtiquettes.findFirst({
      where: eq(fichesEtiquettes.produitId, produit.id),
      columns: { id: true },
      orderBy: [desc(fichesEtiquettes.creeLe)],
    });
    return { produitId: produit.id, ficheId: fiche?.id ?? null };
  }
);

/**
 * Whitelist of produit fields Marie may edit (editable-fiche pattern). Grows as
 * cards get wired (Identité…). The title (`denominationFr`) is the first.
 */
export const CHAMPS_PRODUIT_EDITABLES = [
  "codePf", // model code — the authoritative product identity (replaces the IMP-… placeholder)
  "denominationFr",
  "typeTheFr",
  "origine",
  "conditionnement",
  "poidsNet",
  "tempsInfusion",
  "tempInfusion",
  "nbTasses",
  "sousDesignationFr",
] as const;

export type ChampProduitEditable = (typeof CHAMPS_PRODUIT_EDITABLES)[number];

/**
 * Updates a whitelisted set of produit fields, returning the previous values
 * (for the audit diff). Caller (Server Action) guarantees the keys are allowed.
 * Note: editing a produit field affects EVERY fiche of that product.
 */
export async function updateProduitChamps(
  produitId: string,
  champs: Partial<Record<ChampProduitEditable, string>>
): Promise<{ avant: Record<string, string | null> }> {
  const before = await db.query.produits.findFirst({
    where: eq(produits.id, produitId),
  });
  if (!before) {
    throw new Error("Produit introuvable");
  }

  try {
    await db
      .update(produits)
      .set({ ...champs, misAJourLe: new Date() })
      .where(eq(produits.id, produitId));
  } catch (e) {
    // codePf is UNIQUE — surface a readable message instead of the raw PG error.
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "23505") {
      throw new Error("Ce code modèle est déjà utilisé par un autre produit.");
    }
    throw e;
  }

  const avant = Object.fromEntries(
    Object.keys(champs).map((k) => [k, (before as Record<string, unknown>)[k] as string | null ?? null])
  );
  return { avant };
}

/**
 * Un produit « au catalogue » : ni retiré, ni supprimé. C'est ce que voient les
 * listes, le pipeline, le sélecteur de nouvelle fiche et les compteurs.
 */
export const PRODUIT_ACTIF = and(isNull(produits.archiveLe), isNull(produits.retireLe))!;

/** Retiré du catalogue mais toujours dans l'application — réversible. */
export const PRODUIT_RETIRE = and(isNull(produits.archiveLe), isNotNull(produits.retireLe))!;

/** Tout ce qui n'est pas supprimé, quel que soit l'état catalogue. */
export const PRODUIT_NON_SUPPRIME = isNull(produits.archiveLe);

export type FiltreCatalogue = "actifs" | "retires" | "tous";

export function filtreCatalogue(filtre: FiltreCatalogue) {
  if (filtre === "retires") return PRODUIT_RETIRE;
  if (filtre === "tous") return PRODUIT_NON_SUPPRIME;
  return PRODUIT_ACTIF;
}

/**
 * Retire un produit du catalogue. Réversible d'un clic, contrairement à la
 * suppression : le produit reste une référence de la maison, il n'est
 * simplement plus commercialisé. Pas de saisie de code à confirmer — le geste
 * se défait.
 */
export async function retirerDuCatalogue(params: {
  produitId: string;
  utilisateurId: string;
  motif: string;
}): Promise<{ codePf: string; denomination: string }> {
  const produit = await db.query.produits.findFirst({
    where: eq(produits.id, params.produitId),
    columns: { codePf: true, denominationFr: true, archiveLe: true, retireLe: true },
  });
  if (!produit) throw new Error("Produit introuvable.");
  if (produit.archiveLe) throw new Error("Ce produit est supprimé.");
  if (produit.retireLe) throw new Error("Ce produit est déjà retiré du catalogue.");

  await db
    .update(produits)
    .set({
      retireLe: new Date(),
      retirePar: params.utilisateurId,
      motifRetrait: params.motif,
      misAJourLe: new Date(),
    })
    .where(eq(produits.id, params.produitId));

  return { codePf: produit.codePf, denomination: produit.denominationFr };
}

/** Remet un produit retiré au catalogue. Le motif du retrait reste en trace. */
export async function remettreAuCatalogue(params: {
  produitId: string;
}): Promise<{ codePf: string }> {
  const produit = await db.query.produits.findFirst({
    where: eq(produits.id, params.produitId),
    columns: { codePf: true, archiveLe: true },
  });
  if (!produit) throw new Error("Produit introuvable.");
  if (produit.archiveLe) throw new Error("Ce produit est supprimé, il ne peut pas revenir.");

  await db
    .update(produits)
    .set({ retireLe: null, retirePar: null, misAJourLe: new Date() })
    .where(eq(produits.id, params.produitId));

  return { codePf: produit.codePf };
}

export interface ArchiverParams {
  produitId: string;
  utilisateurId: string;
  motif: string;
  /** Code retyped by the user; checked INSIDE the transaction, before writing. */
  codeSaisi: string;
}

/**
 * Archives a product. Nothing is deleted: its fiches, recettes, source documents
 * and BAT links stay attached, and the act is signed. There is deliberately no
 * un-archive in the application — a mistake is repaired by re-creating the
 * product, or, if it really matters, by an intervention outside the app.
 *
 * The archive reference is allocated inside the transaction so two simultaneous
 * archivings can never share one.
 */
export async function archiverProduit(
  params: ArchiverParams
): Promise<{ refArchive: string; codePf: string; denomination: string }> {
  return db.transaction(async (tx) => {
    const produit = await tx.query.produits.findFirst({
      where: eq(produits.id, params.produitId),
      columns: { id: true, codePf: true, denominationFr: true, archiveLe: true },
    });
    if (!produit) throw new Error("Produit introuvable.");
    if (produit.archiveLe) throw new Error("Ce produit est déjà archivé.");
    if (produit.codePf.trim().toUpperCase() !== params.codeSaisi.trim().toUpperCase()) {
      throw new Error("Le code saisi ne correspond pas au produit.");
    }

    const [{ total }] = await tx
      .select({ total: count() })
      .from(produits)
      .where(isNotNull(produits.archiveLe));
    const refArchive = `ARCH-${new Date().getFullYear()}-${String(total + 1).padStart(4, "0")}`;

    await tx
      .update(produits)
      .set({
        archiveLe: new Date(),
        archivePar: params.utilisateurId,
        motifArchivage: params.motif,
        refArchive,
        misAJourLe: new Date(),
      })
      .where(eq(produits.id, params.produitId));

    return { refArchive, codePf: produit.codePf, denomination: produit.denominationFr };
  });
}

/** The archive register, most recent first. */
export async function getProduitsArchives() {
  return db
    .select()
    .from(produits)
    .where(isNotNull(produits.archiveLe))
    .orderBy(desc(produits.archiveLe));
}
