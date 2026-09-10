import { cache } from "react";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { gammes, produits, sousGammes } from "@/db/schema";

export interface SousGammeReferentiel {
  id: string;
  nom: string;
  active: boolean;
  /** Produits actifs qui portent ce libellé de sous-gamme sous cette gamme. */
  nbProduits: number;
}

export interface GammeReferentiel {
  id: string;
  nom: string;
  active: boolean;
  /** Produits actifs qui portent ce libellé de gamme. */
  nbProduits: number;
  sousGammes: SousGammeReferentiel[];
}

/**
 * Le référentiel des gammes, avec ce que le catalogue en fait aujourd'hui.
 *
 * Le décompte se fait encore par le LIBELLÉ : `produits.gamme` est une chaîne,
 * pas une référence. C'est précisément ce que le lot suivant remplacera — mais
 * afficher le nombre de produits dès maintenant est ce qui rend les accidents
 * visibles : une gamme à 1 produit à côté d'une à 89 se voit sans explication.
 */
export const getReferentielGammes = cache(async (): Promise<GammeReferentiel[]> => {
  const lignes = await db
    .select({
      id: gammes.id,
      nom: gammes.nom,
      active: gammes.active,
      nbProduits: sql<number>`(
        select count(*)::int from ${produits}
        where btrim(${produits.gamme}) = ${gammes.nom} and ${produits.archiveLe} is null
      )`,
    })
    .from(gammes)
    .orderBy(asc(gammes.nom));

  const sous = await db
    .select({
      id: sousGammes.id,
      gammeId: sousGammes.gammeId,
      nom: sousGammes.nom,
      active: sousGammes.active,
      // Compté SOUS SA GAMME, jamais sur le seul libellé : « LES INFUSIONS DE
      // PLANTES » existe sous deux gammes différentes, et l'afficher à 32 sous
      // une gamme qui n'en porte que 20 ne veut rien dire.
      nbProduits: sql<number>`(
        select count(*)::int from ${produits}
        where btrim(${produits.sousGamme}) = ${sousGammes.nom}
          and btrim(${produits.gamme}) = (select g.nom from ${gammes} g where g.id = ${sousGammes.gammeId})
          and ${produits.archiveLe} is null
      )`,
    })
    .from(sousGammes)
    .orderBy(asc(sousGammes.nom));

  return lignes.map((g) => ({
    ...g,
    sousGammes: sous.filter((s) => s.gammeId === g.id).map(({ gammeId: _g, ...s }) => s),
  }));
});

/** Les libellés de gamme portés par un produit et absents du référentiel. */
export const getGammesOrphelines = cache(async (): Promise<string[]> => {
  const lignes = await db
    .selectDistinct({ nom: sql<string>`btrim(${produits.gamme})` })
    .from(produits)
    .leftJoin(gammes, eq(gammes.nom, sql`btrim(${produits.gamme})`))
    .where(and(isNull(produits.archiveLe), isNull(gammes.id)));
  return lignes.map((l) => l.nom).filter((n) => n !== "");
});

export async function creerGamme(nom: string): Promise<{ id: string }> {
  const [ligne] = await db.insert(gammes).values({ nom }).returning({ id: gammes.id });
  return ligne;
}

export async function creerSousGamme(gammeId: string, nom: string): Promise<{ id: string }> {
  const [ligne] = await db
    .insert(sousGammes)
    .values({ gammeId, nom })
    .returning({ id: sousGammes.id });
  return ligne;
}

/**
 * Renomme une gamme et suit les produits qui la portent.
 *
 * Tant que le produit désigne sa gamme par son libellé, renommer sans propager
 * détacherait ses produits en silence — l'accident même que le référentiel
 * existe pour supprimer. Les deux écritures partent donc ensemble.
 */
export async function renommerGamme(id: string, nom: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [avant] = await tx.select({ nom: gammes.nom }).from(gammes).where(eq(gammes.id, id));
    if (!avant) return;
    await tx.update(gammes).set({ nom, misAJourLe: new Date() }).where(eq(gammes.id, id));
    await tx
      .update(produits)
      .set({ gamme: nom, misAJourLe: new Date() })
      .where(and(eq(sql`btrim(${produits.gamme})`, avant.nom), isNull(produits.archiveLe)));
  });
}

export async function renommerSousGamme(id: string, nom: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [avant] = await tx
      .select({ nom: sousGammes.nom })
      .from(sousGammes)
      .where(eq(sousGammes.id, id));
    if (!avant) return;
    await tx.update(sousGammes).set({ nom, misAJourLe: new Date() }).where(eq(sousGammes.id, id));
    await tx
      .update(produits)
      .set({ sousGamme: nom, misAJourLe: new Date() })
      .where(and(eq(sql`btrim(${produits.sousGamme})`, avant.nom), isNull(produits.archiveLe)));
  });
}

/**
 * Retire une gamme des listes de choix sans l'effacer. Des produits l'ont
 * portée et des paquets sont imprimés : son histoire reste lisible.
 */
export async function basculerActivite(
  table: "gamme" | "sousGamme",
  id: string,
  active: boolean
): Promise<void> {
  const cible = table === "gamme" ? gammes : sousGammes;
  await db.update(cible).set({ active, misAJourLe: new Date() }).where(eq(cible.id, id));
}
