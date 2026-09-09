"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { CHAMPS_FICHE_EDITABLES, updateFicheEtiquetteChamps, updateDossier } from "@/db/queries/fiches";
import { CHAMPS_PRODUIT_EDITABLES, updateProduitChamps } from "@/db/queries/produits";
import {
  CHAMPS_DEGUSTATION_EDITABLES,
  upsertDegustationChamps,
} from "@/db/queries/degustation";
import { writeAuditLog } from "@/db/queries/audit-logs";

const Schema = z.object({
  table: z.enum(["fiche", "produit", "degustation"]),
  /** Row id — ficheId / produitId / degustationId. Null for a not-yet-created dégustation. */
  id: z.string().uuid().nullable().optional(),
  /** Needed to create a dégustation when none exists. */
  produitId: z.string().uuid().optional(),
  /** Fiche whose page to revalidate. */
  ficheId: z.string().uuid(),
  champs: z.record(z.string(), z.string().nullable()),
});

/** Violation de contrainte d'unicité Postgres (23505), quel que soit le driver. */
function estCollisionUnicite(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === "23505";
}

const WHITELIST: Record<"fiche" | "produit" | "degustation", Set<string>> = {
  fiche: new Set(CHAMPS_FICHE_EDITABLES),
  produit: new Set(CHAMPS_PRODUIT_EDITABLES),
  degustation: new Set(CHAMPS_DEGUSTATION_EDITABLES),
};

/**
 * Saves a per-card edit of fiche / produit / dégustation text fields (editable-
 * fiche pattern). auth → Zod → per-table whitelist (no mass assignment) → query
 * delegation → audit-log the diff → revalidate. Fiche & dégustation fields:
 * "" → null. Produit fields: kept as string (some NOT NULL); the title can't be
 * emptied. Dégustation is upserted (created if none exists).
 */
export async function updateChampsAction(input: unknown) {
  const data = Schema.parse(input);

  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const allowed = WHITELIST[data.table];
  const champs: Record<string, string | boolean | string[] | null> = {};
  for (const [k, v] of Object.entries(data.champs)) {
    if (!allowed.has(k)) continue;
    if (data.table === "produit") {
      // Deux champs du dossier PMI ne sont pas du texte. Le formulaire ne sait
      // envoyer que des chaînes : la conversion se fait ici, avant l'écriture,
      // et une valeur vide reste NULL — « non renseigné » n'est pas « non ».
      if (k === "volumineux") {
        const val = (v ?? "").trim();
        champs[k] = val === "" ? null : val === "true";
        continue;
      }
      if (k === "labelsMP") {
        champs[k] = (v ?? "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        continue;
      }
      const val = (v ?? "").trim();
      if (k === "denominationFr" && val === "") {
        throw new Error("Le titre ne peut pas être vide.");
      }
      if (k === "codePf" && val === "") {
        throw new Error("Le code modèle ne peut pas être vide.");
      }
      champs[k] = val;
    } else {
      // fiche & degustation: nullable → "" becomes null
      champs[k] = v && v.trim() !== "" ? v : null;
    }
  }
  if (Object.keys(champs).length === 0) {
    throw new Error("Aucun champ modifiable fourni.");
  }

  let avant: Record<string, string | null>;
  let entiteId: string;

  if (data.table === "fiche") {
    if (!data.id) throw new Error("Identifiant fiche manquant.");
    // `codeEtiquette` est unique en base : deux fiches ne peuvent pas porter le
    // même. Sans traduction, Marie reçoit le message brut de Postgres et ne sait
    // pas que le code est déjà pris ailleurs.
    try {
      ({ avant } = await updateFicheEtiquetteChamps(data.id, champs));
    } catch (e) {
      if (estCollisionUnicite(e) && "codeEtiquette" in champs) {
        throw new Error(
          `Le code étiquette « ${champs.codeEtiquette} » est déjà porté par une autre fiche.`
        );
      }
      throw e;
    }
    entiteId = data.id;
  } else if (data.table === "produit") {
    if (!data.id) throw new Error("Identifiant produit manquant.");
    ({ avant } = await updateProduitChamps(data.id, champs));
    entiteId = data.id;
  } else {
    if (!data.produitId) throw new Error("Produit requis pour la dégustation.");
    const res = await upsertDegustationChamps({
      produitId: data.produitId,
      degustationId: data.id ?? null,
      champs,
    });
    avant = res.avant;
    entiteId = res.degustationId;
  }

  await writeAuditLog({
    typeEntite:
      data.table === "fiche"
        ? "fiche_etiquette"
        : data.table === "produit"
          ? "produit"
          : "degustation",
    entiteId,
    action: "CHAMPS_MODIFIES",
    utilisateurId: session.user.id,
    changements: { table: data.table, avant, apres: champs },
  });

  revalidatePath(`/etiquettes/${data.ficheId}`);
  return { ok: true as const };
}

// "Données complémentaires" — fields by table + special types (editable-fiche étape 2).
const DOSSIER_PRODUIT_TEXTE = [
  "floId",
  "nomLatin",
  "dateMiseMarche",
  "fournisseur",
  "producteurJardin",
  "infoProducteur",
  "typeProducteur",
];
const DOSSIER_FICHE_TEXTE = ["allegationChoisie", "nbTassesAllegation"];

const DossierSchema = z.object({
  ficheId: z.string().uuid(),
  produitId: z.string().uuid(),
  degustationId: z.string().uuid().nullable().optional(),
  champs: z.record(z.string(), z.string().nullable()),
});

const texteOuNull = (v: string | null | undefined) =>
  v && v.trim() !== "" ? v : null;

/**
 * Saves the "Données complémentaires & arbitrages" card — mixed produit + fiche +
 * dégustation, with special types (estAromatise boolean, labelsClient list). auth
 * → Zod → coerce/whitelist per field → one transaction (updateDossier) → audit.
 */
export async function updateDossierAction(input: unknown) {
  const data = DossierSchema.parse(input);

  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const c = data.champs;
  const produit: Record<string, unknown> = {};
  for (const k of DOSSIER_PRODUIT_TEXTE) if (k in c) produit[k] = texteOuNull(c[k]);
  if ("estAromatise" in c) produit.estAromatise = c.estAromatise === "true";
  if ("labelsClient" in c) {
    produit.labelsClient = (c.labelsClient ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const fiche: Record<string, unknown> = {};
  for (const k of DOSSIER_FICHE_TEXTE) if (k in c) fiche[k] = texteOuNull(c[k]);

  const degustation: Record<string, unknown> = {};
  if ("numeroDeLot" in c) {
    const v = texteOuNull(c.numeroDeLot);
    // Don't create an empty dégustation row just for a blank lot number.
    if (v !== null || data.degustationId) degustation.numeroDeLot = v;
  }

  const { degustationId } = await updateDossier({
    ficheId: data.ficheId,
    produitId: data.produitId,
    degustationId: data.degustationId ?? null,
    produit,
    fiche,
    degustation,
  });

  await writeAuditLog({
    typeEntite: "produit",
    entiteId: data.produitId,
    action: "DOSSIER_MODIFIE",
    utilisateurId: session.user.id,
    changements: { produit, fiche, degustation, degustationId },
  });

  revalidatePath(`/etiquettes/${data.ficheId}`);
  return { ok: true as const };
}
