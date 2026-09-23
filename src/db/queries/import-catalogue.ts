/**
 * Reads and writes for the catalogue workbook import
 * (docs/decisions/2026-09-23-import-bdd-v2-preprod.md). The plan itself is
 * built by pure code in src/lib/import-catalogue/; this file only loads the
 * current state and executes an approved plan.
 */
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, fichesEtiquettes, gammes, produits, sousGammes, utilisateurs } from "@/db/schema";
import type { GammeRef, SousGammeRef } from "@/lib/import-catalogue/gammes";
import type { EtatCatalogue, FicheExistante, LibelleInconnu, Plan, ProduitExistant } from "@/lib/import-catalogue/plan";
import type { Valeur } from "@/lib/import-catalogue/types";

/** Every fiche an import creates enters the Quality review, like the March seed's. */
const STATUT_FICHE_IMPORTEE = "QUALITY_REVIEW";
const MARQUE_JDG = "JDG";

export async function nomBaseCourante(): Promise<string> {
  const resultat = await db.execute<{ nom: string }>(sql`select current_database() as nom`);
  return resultat.rows[0].nom;
}

export async function chargerReferentielGammes(): Promise<{ gammes: GammeRef[]; sousGammes: SousGammeRef[] }> {
  const [g, s] = await Promise.all([
    db.select({ id: gammes.id, nom: gammes.nom }).from(gammes),
    db.select({ id: sousGammes.id, gammeId: sousGammes.gammeId, nom: sousGammes.nom }).from(sousGammes),
  ]);
  return { gammes: g, sousGammes: s };
}

export async function chargerEtatCatalogue(): Promise<EtatCatalogue> {
  const lignesProduits = await db
    .select({ produit: produits, creeLe: sql<string>`to_char(${produits.creeLe}, 'YYYY-MM-DD')` })
    .from(produits);
  const lignesFiches = await db.select().from(fichesEtiquettes);

  const produitsExistants: ProduitExistant[] = lignesProduits.map(({ produit: p, creeLe }) => ({
    id: p.id, codePf: p.codePf, archive: p.archiveLe !== null, creeLe,
    denominationFr: p.denominationFr, denominationEn: p.denominationEn,
    sousDesignationFr: p.sousDesignationFr, sousDesignationEn: p.sousDesignationEn,
    typeTheFr: p.typeTheFr, typeTheEn: p.typeTheEn, origine: p.origine, producteurJardin: p.producteurJardin,
    estAromatise: p.estAromatise, codeEan: p.codeEan, poidsNet: p.poidsNet, tempsInfusion: p.tempsInfusion,
    tempInfusion: p.tempInfusion, poidsTasse: p.poidsTasse, nbTasses: p.nbTasses,
    plusieursInfusions: p.plusieursInfusions, mentionEcocert: p.mentionEcocert, labelsClient: p.labelsClient,
    // A product without a range id predates migration 0022; an empty id compares as "no value".
    gammeId: p.gammeId ?? "", sousGammeId: p.sousGammeId,
  }));
  const fichesExistantes: FicheExistante[] = lignesFiches.map((f) => ({
    id: f.id, produitId: f.produitId,
    denominationLegale: f.denominationLegale, texteCommercialFr: f.texteCommercialFr,
    texteCommercialCourtFr: f.texteCommercialCourtFr, texteCommercialEn: f.texteCommercialEn,
    ingredientsFr: f.ingredientsFr, ingredientsEn: f.ingredientsEn, allergenes: f.allergenes,
    allegationsSanteFr: f.allegationsSanteFr, allegationsSanteEn: f.allegationsSanteEn,
    phraseWftoFr: f.phraseWftoFr, statutWfto: f.statutWfto, phraseEngagesFr: f.phraseEngagesFr,
    sousDesignationDe: f.sousDesignationDe, ingredientsDe: f.ingredientsDe,
    sousDesignationIt: f.sousDesignationIt, ingredientsIt: f.ingredientsIt,
    sousDesignationNl: f.sousDesignationNl, ingredientsNl: f.ingredientsNl,
    refFacing: f.refFacing, refContre: f.refContre, codeEtiquette: f.codeEtiquette,
  }));
  return { produits: produitsExistants, fiches: fichesExistantes };
}

/**
 * Creates the ranges and sub-ranges the workbook names and the referential
 * lacks — preprod only, on Ouro's decision of 2026-09-23, so the catalogue can
 * land before the Quality tidies the referential. Ambiguous labels are never
 * created: they need a person. Returns what was created, for the report.
 */
export async function creerLibellesManquants(inconnus: readonly LibelleInconnu[]): Promise<string[]> {
  const aCreer = inconnus.filter((l) => l.motif === "inconnue");
  return db.transaction(async (tx) => {
    const crees: string[] = [];
    for (const l of aCreer.filter((x) => x.type === "gamme")) {
      await tx.insert(gammes).values({ nom: l.libelle.trim() }).onConflictDoNothing();
      crees.push(`gamme « ${l.libelle.trim()} »`);
    }
    const toutes = await tx.select({ id: gammes.id, nom: gammes.nom }).from(gammes);
    for (const l of aCreer.filter((x) => x.type === "sous-gamme")) {
      const parente = toutes.find((g) => g.nom === l.gamme);
      if (!parente) continue;
      await tx.insert(sousGammes).values({ gammeId: parente.id, nom: l.libelle.trim() }).onConflictDoNothing();
      crees.push(`sous-gamme « ${l.libelle.trim()} » dans « ${parente.nom} »`);
    }
    return crees;
  });
}

type RoleUtilisateur = (typeof utilisateurs.$inferSelect)["role"];

/** The account that signs the import in audit_logs (Direction, decision of 2026-09-23). */
export async function trouverSignataireId(role: RoleUtilisateur): Promise<string | null> {
  const compte = await db.query.utilisateurs.findFirst({ where: eq(utilisateurs.role, role) });
  return compte?.id ?? null;
}

export interface BilanApplication {
  produitsCrees: number;
  fichesCreees: number;
  produitsModifies: number;
  fichesModifiees: number;
}

/**
 * Executes an approved plan in one transaction: either the whole sheet lands,
 * or nothing does. Only `prendre` decisions are written; the range labels are
 * kept in step with the ids they reflect.
 */
export async function appliquerPlan(plan: Plan, source: string, utilisateurId: string): Promise<BilanApplication> {
  return db.transaction(async (tx) => {
    const nomsGammes = new Map((await tx.select({ id: gammes.id, nom: gammes.nom }).from(gammes)).map((g) => [g.id, g.nom]));
    const nomsSousGammes = new Map((await tx.select({ id: sousGammes.id, nom: sousGammes.nom }).from(sousGammes)).map((s) => [s.id, s.nom]));
    const reflets = (gammeId: string | undefined, sousGammeId: string | null | undefined) => ({
      ...(gammeId !== undefined ? { gamme: nomsGammes.get(gammeId) ?? "" } : {}),
      ...(sousGammeId !== undefined ? { sousGamme: sousGammeId === null ? null : (nomsSousGammes.get(sousGammeId) ?? null) } : {}),
    });
    const bilan: BilanApplication = { produitsCrees: 0, fichesCreees: 0, produitsModifies: 0, fichesModifiees: 0 };

    for (const creation of plan.creations) {
      const [produit] = await tx
        .insert(produits)
        .values({
          ...creation.produit,
          codePf: creation.codePf,
          marque: MARQUE_JDG,
          gamme: nomsGammes.get(creation.produit.gammeId) ?? "",
          sousGamme: creation.produit.sousGammeId === null ? null : (nomsSousGammes.get(creation.produit.sousGammeId) ?? null),
        })
        .returning({ id: produits.id });
      await tx.insert(fichesEtiquettes).values({ produitId: produit.id, ...creation.fiche, statut: STATUT_FICHE_IMPORTEE });
      bilan.produitsCrees += 1;
      bilan.fichesCreees += 1;
    }

    for (const maj of plan.misesAJour) {
      const champsProduit = aEcrire(maj.decisionsProduit);
      if (Object.keys(champsProduit).length > 0) {
        const { gammeId, sousGammeId } = champsProduit as { gammeId?: string; sousGammeId?: string | null };
        await tx
          .update(produits)
          .set({ ...champsProduit, ...reflets(gammeId, sousGammeId), misAJourLe: new Date() })
          .where(eq(produits.id, maj.produitId));
        bilan.produitsModifies += 1;
      }
      const champsFiche = aEcrire(maj.decisionsFiche);
      if (maj.ficheId !== null && Object.keys(champsFiche).length > 0) {
        await tx.update(fichesEtiquettes).set({ ...champsFiche, misAJourLe: new Date() }).where(eq(fichesEtiquettes.id, maj.ficheId));
        bilan.fichesModifiees += 1;
      }
    }

    await tx.insert(auditLogs).values({
      typeEntite: "import_catalogue",
      entiteId: source.slice(0, 255),
      action: "IMPORT_BDD_V2",
      utilisateurId,
      // The signing account authorised it; the script did it. Both are recorded.
      changements: { ...bilan, misDeCote: plan.misDeCote.length, executePar: "scripts/importer-bdd-v2.ts" },
    });
    return bilan;
  });
}

function aEcrire(decisions: Plan["misesAJour"][number]["decisionsProduit"]): Record<string, Valeur> {
  return Object.fromEntries(decisions.filter((d) => d.decision === "prendre").map((d) => [d.champ, d.excel]));
}
