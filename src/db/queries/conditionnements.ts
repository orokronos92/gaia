/**
 * Reads and writes for the packaging notions of migration 0027: sales format
 * and pack on the product, measured size and template on each label file.
 */
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { fichiersEtiquettes, formatsVente, gabaritsEtiquette, produits } from "@/db/schema";

export async function chargerFormatsVente() {
  return db.select({ id: formatsVente.id, chiffre: formatsVente.chiffre, cle: formatsVente.cle }).from(formatsVente);
}

export async function chargerGabarits() {
  return db
    .select({ id: gabaritsEtiquette.id, cle: gabaritsEtiquette.cle, petitCoteMm: gabaritsEtiquette.petitCoteMm, grandCoteMm: gabaritsEtiquette.grandCoteMm })
    .from(gabaritsEtiquette);
}

/** Active products a computation may touch: a format chosen by a person is left alone. */
export async function chargerProduitsAQualifier() {
  return db
    .select({ id: produits.id, codePf: produits.codePf, formatVenteId: produits.formatVenteId, emballage: produits.emballage })
    .from(produits)
    .where(and(isNull(produits.archiveLe), eq(produits.formatVenteManuel, false)));
}

/** Label PDFs not measured yet. */
export async function chargerFichiersAMesurer() {
  return db
    .select({ id: fichiersEtiquettes.id, cleS3: fichiersEtiquettes.cleS3 })
    .from(fichiersEtiquettes)
    .where(and(eq(fichiersEtiquettes.type, "BAT"), isNull(fichiersEtiquettes.mesureSource)));
}

export interface QualificationProduit {
  id: string;
  formatVenteId?: string | null;
  emballage?: string;
}

export interface MesureFichier {
  cleS3: string;
  largeurMm: number;
  hauteurMm: number;
  mesureSource: "TRIM" | "MEDIA";
  gabaritId: string | null;
}

/** One transaction for the whole catalogue: it lands entirely or not at all. */
export async function enregistrerQualification(produitsAQualifier: readonly QualificationProduit[], mesures: readonly MesureFichier[]) {
  return db.transaction(async (tx) => {
    for (const { id, ...champs } of produitsAQualifier) {
      await tx.update(produits).set({ ...champs, misAJourLe: new Date() }).where(eq(produits.id, id));
    }
    // A file linked to several products (one artwork, several rows) is measured once.
    for (const { cleS3, ...mesure } of mesures) {
      await tx
        .update(fichiersEtiquettes)
        .set({ ...mesure, misAJourLe: new Date() })
        .where(and(eq(fichiersEtiquettes.cleS3, cleS3), inArray(fichiersEtiquettes.type, ["BAT"])));
    }
    return { produits: produitsAQualifier.length, fichiers: mesures.length };
  });
}
