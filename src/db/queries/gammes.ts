import { cache } from "react";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import type { Catalogue } from "@/lib/catalogues";
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
  /** §11.2 — ce que la gamme impose sur l'étiquette. */
  exigeMentionAnemos: boolean;
  exigeMentionEngages: boolean;
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
  // Les décomptes se font en UNE passe groupée, pas en sous-requêtes corrélées.
  //
  // La version corrélée s'est retournée contre elle-même : Drizzle rend les
  // colonnes sans qualification, et le jour où `produits` a gagné une colonne
  // `gamme_id`, le `"gamme_id"` nu de la sous-requête s'est mis à désigner
  // celle-là plutôt que celle de `sous_gammes`. La sous-gamme comptait alors
  // tous ses homonymes, gammes confondues — 32 au lieu de 18 — sans la moindre
  // erreur. Grouper une fois et rapprocher en mémoire ne se prête pas au piège.
  const [lignes, sous, comptes] = await Promise.all([
    db
      .select({
        id: gammes.id,
        nom: gammes.nom,
        active: gammes.active,
        exigeMentionAnemos: gammes.exigeMentionAnemos,
        exigeMentionEngages: gammes.exigeMentionEngages,
      })
      .from(gammes)
      .orderBy(asc(gammes.nom)),
    db
      .select({
        id: sousGammes.id,
        gammeId: sousGammes.gammeId,
        nom: sousGammes.nom,
        active: sousGammes.active,
      })
      .from(sousGammes)
      .orderBy(asc(sousGammes.nom)),
    db
      .select({
        gamme: sql<string>`btrim(coalesce(${produits.gamme}, ''))`,
        sousGamme: sql<string>`btrim(coalesce(${produits.sousGamme}, ''))`,
        n: sql<number>`count(*)::int`,
      })
      .from(produits)
      .where(isNull(produits.archiveLe))
      .groupBy(
        sql`btrim(coalesce(${produits.gamme}, ''))`,
        sql`btrim(coalesce(${produits.sousGamme}, ''))`
      ),
  ]);

  const parGamme = new Map<string, number>();
  const parCouple = new Map<string, number>();
  for (const c of comptes) {
    parGamme.set(c.gamme, (parGamme.get(c.gamme) ?? 0) + c.n);
    parCouple.set(`${c.gamme}\u0000${c.sousGamme}`, c.n);
  }

  return lignes.map((g) => ({
    ...g,
    nbProduits: parGamme.get(g.nom) ?? 0,
    sousGammes: sous
      .filter((x) => x.gammeId === g.id)
      .map(({ gammeId: _g, ...x }) => ({
        ...x,
        nbProduits: parCouple.get(`${g.nom}\u0000${x.nom}`) ?? 0,
      })),
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

export interface ChoixGamme {
  id: string;
  nom: string;
  active: boolean;
  sousGammes: { id: string; nom: string; active: boolean }[];
}

/**
 * De quoi remplir les deux listes de la fiche produit.
 *
 * Les gammes retirées des choix sont renvoyées quand même, avec leur drapeau :
 * un produit posé sur une gamme retirée doit continuer d'afficher la sienne,
 * sinon la liste lui en attribuerait une autre au premier enregistrement.
 */
/** Range choices, limited to one catalogue when given (JDG's ranges offer no pepper). */
export const getChoixGammes = cache(async (catalogue?: Catalogue): Promise<ChoixGamme[]> => {
  const [g, s] = await Promise.all([
    db
      .select({ id: gammes.id, nom: gammes.nom, active: gammes.active })
      .from(gammes)
      .where(catalogue ? eq(gammes.catalogue, catalogue) : undefined)
      .orderBy(asc(gammes.nom)),
    db
      .select({ id: sousGammes.id, gammeId: sousGammes.gammeId, nom: sousGammes.nom, active: sousGammes.active })
      .from(sousGammes)
      .orderBy(asc(sousGammes.nom)),
  ]);
  return g.map((gamme) => ({
    ...gamme,
    sousGammes: s.filter((x) => x.gammeId === gamme.id).map(({ gammeId: _g, ...x }) => x),
  }));
});

/** Le couple d'identifiants correspondant aux libellés choisis, ou null. */
export async function resoudreGamme(
  nomGamme: string,
  nomSousGamme?: string | null
): Promise<{ gammeId: string | null; sousGammeId: string | null }> {
  const [gamme] = await db
    .select({ id: gammes.id })
    .from(gammes)
    .where(eq(gammes.nom, nomGamme.trim()));
  if (!gamme) return { gammeId: null, sousGammeId: null };

  const nom = (nomSousGamme ?? "").trim();
  if (nom === "") return { gammeId: gamme.id, sousGammeId: null };

  const [sous] = await db
    .select({ id: sousGammes.id })
    .from(sousGammes)
    .where(and(eq(sousGammes.gammeId, gamme.id), eq(sousGammes.nom, nom)));
  return { gammeId: gamme.id, sousGammeId: sous?.id ?? null };
}

/**
 * Ce que la gamme impose sur l'étiquette — la seule chose qui décidait jusqu'ici
 * de deux contrôles réglementaires, et qui se devinait dans son libellé.
 */
export async function definirObligation(
  id: string,
  mention: "anemos" | "engages",
  exige: boolean
): Promise<void> {
  await db
    .update(gammes)
    .set(
      mention === "anemos"
        ? { exigeMentionAnemos: exige, misAJourLe: new Date() }
        : { exigeMentionEngages: exige, misAJourLe: new Date() }
    )
    .where(eq(gammes.id, id));
}
