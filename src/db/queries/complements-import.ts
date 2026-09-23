/**
 * Writes the v2 workbook data that had no field before migration 0028: new
 * product and label-sheet fields, the production-tracking row, and each
 * workbook row kept verbatim. Upserts throughout, so a re-run adds nothing.
 */
import { eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { fichesEtiquettes, lignesSource, produits, suiviFabrication } from "@/db/schema";
import type { ComplementsJdg } from "@/lib/import-catalogue/complements-jdg";

export interface CibleProduit {
  produitId: string;
  /** Null when the product has no fiche or several: the label-sheet part is then skipped. */
  ficheId: string | null;
}

/** Active product codes → their product and, when there is exactly one, their fiche. */
export async function chargerCibles(): Promise<Map<string, CibleProduit>> {
  const lignes = await db
    .select({ codePf: produits.codePf, produitId: produits.id, ficheId: fichesEtiquettes.id })
    .from(produits)
    .leftJoin(fichesEtiquettes, eq(fichesEtiquettes.produitId, produits.id))
    .where(isNull(produits.archiveLe));
  const cibles = new Map<string, CibleProduit & { fiches: number }>();
  for (const l of lignes) {
    const c = cibles.get(l.codePf) ?? { produitId: l.produitId, ficheId: null, fiches: 0 };
    if (l.ficheId) {
      c.fiches += 1;
      c.ficheId = c.fiches === 1 ? l.ficheId : null;
    }
    cibles.set(l.codePf, c);
  }
  return new Map([...cibles].map(([code, { produitId, ficheId }]) => [code, { produitId, ficheId }]));
}

export interface LigneSourceAEcrire {
  fichier: string;
  onglet: string;
  numeroLigne: number;
  codePf: string | null;
  produitId: string | null;
  donnees: Record<string, string>;
}

export interface ComplementAEcrire {
  cible: CibleProduit;
  complements: ComplementsJdg;
}

export async function ecrireComplements(complements: readonly ComplementAEcrire[], lignes: readonly LigneSourceAEcrire[]) {
  return db.transaction(async (tx) => {
    let suivis = 0;
    for (const { cible, complements: c } of complements) {
      await tx.update(produits).set({ ...c.produit, misAJourLe: new Date() }).where(eq(produits.id, cible.produitId));
      if (cible.ficheId === null) continue;
      await tx.update(fichesEtiquettes).set({ ...c.fiche, misAJourLe: new Date() }).where(eq(fichesEtiquettes.id, cible.ficheId));
      await tx
        .insert(suiviFabrication)
        .values({ ficheEtiquetteId: cible.ficheId, ...c.suivi })
        .onConflictDoUpdate({ target: suiviFabrication.ficheEtiquetteId, set: { ...c.suivi, misAJourLe: new Date() } });
      suivis += 1;
    }
    for (const ligne of lignes) {
      await tx
        .insert(lignesSource)
        .values(ligne)
        .onConflictDoUpdate({
          target: [lignesSource.fichier, lignesSource.onglet, lignesSource.numeroLigne],
          set: { codePf: ligne.codePf, produitId: ligne.produitId, donnees: ligne.donnees, importeLe: sql`now()` },
        });
    }
    return { produits: complements.length, suivis, lignesSource: lignes.length };
  });
}

export interface ValeursAEcrire {
  cible: CibleProduit;
  produit: Record<string, string>;
  fiche: Record<string, string>;
  suivi: Record<string, string>;
}

/**
 * Writes what a complementary sheet (FR et EN, CODE ARTI EXPORT) gives: only
 * the fields it fills, so an empty cell never erases the JDG sheet's value.
 */
export async function ecrireOngletComplementaire(items: readonly ValeursAEcrire[], lignes: readonly LigneSourceAEcrire[]) {
  return db.transaction(async (tx) => {
    let produitsMaj = 0;
    let fichesMaj = 0;
    for (const { cible, produit, fiche, suivi } of items) {
      if (Object.keys(produit).length > 0) {
        await tx.update(produits).set({ ...produit, misAJourLe: new Date() }).where(eq(produits.id, cible.produitId));
        produitsMaj += 1;
      }
      if (cible.ficheId === null) continue;
      if (Object.keys(fiche).length > 0) {
        await tx.update(fichesEtiquettes).set({ ...fiche, misAJourLe: new Date() }).where(eq(fichesEtiquettes.id, cible.ficheId));
        fichesMaj += 1;
      }
      if (Object.keys(suivi).length > 0) {
        await tx
          .insert(suiviFabrication)
          .values({ ficheEtiquetteId: cible.ficheId, ...suivi })
          .onConflictDoUpdate({ target: suiviFabrication.ficheEtiquetteId, set: { ...suivi, misAJourLe: new Date() } });
      }
    }
    for (const ligne of lignes) {
      await tx
        .insert(lignesSource)
        .values(ligne)
        .onConflictDoUpdate({
          target: [lignesSource.fichier, lignesSource.onglet, lignesSource.numeroLigne],
          set: { codePf: ligne.codePf, produitId: ligne.produitId, donnees: ligne.donnees, importeLe: sql`now()` },
        });
    }
    return { produits: produitsMaj, fiches: fichesMaj, lignesSource: lignes.length };
  });
}
