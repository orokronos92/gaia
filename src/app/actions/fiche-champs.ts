"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { CHAMPS_FICHE_EDITABLES, updateFicheEtiquetteChamps, type ChampsFicheEditables } from "@/db/queries/fiches";
import type { StatutMention } from "@/lib/audit/statut-mention";
import { CHAMPS_PRODUIT_EDITABLES, updateProduitChamps } from "@/db/queries/produits";
import { estViolationUnicite } from "@/lib/erreurs-postgres";
import { resoudreGamme } from "@/db/queries/gammes";
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
  /**
   * Un statut de mention est un enum NOT NULL, pas du texte.
   *
   * Le formulaire n'envoie que des chaînes : on vérifie ici que celle-ci est
   * l'une des trois, et on refuse plutôt que de retomber sur `AUTO`. Retomber
   * effacerait sans bruit une décision de la Qualité — l'inverse exact de ce
   * que ces colonnes servent à garantir.
   */
  const estStatutMention = (v: string): v is StatutMention =>
    v === "AUTO" || v === "OUI" || v === "NON";
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
      // Aromatisé is NOT NULL: two states only, never "unknown".
      if (k === "estAromatise") {
        champs[k] = (v ?? "").trim() === "true";
        continue;
      }
      if (k === "labelsMP" || k === "labelsClient") {
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
      if (k === "gamme" && val === "") {
        throw new Error("La gamme ne peut pas être vide.");
      }
      champs[k] = val;
    } else {
      if (data.table === "fiche" && k.startsWith("statut")) {
        const val = (v ?? "").trim();
        if (!estStatutMention(val)) {
          throw new Error(`Statut de mention invalide pour « ${k} » : « ${val} ».`);
        }
        champs[k] = val;
        continue;
      }
      // fiche & degustation: nullable → "" becomes null
      champs[k] = v && v.trim() !== "" ? v : null;
    }
  }
  if (Object.keys(champs).length === 0) {
    throw new Error("Aucun champ modifiable fourni.");
  }

  // La gamme choisie dans la liste vaut aussi un rattachement au référentiel.
  // Le libellé reste écrit — beaucoup d'écrans le lisent — mais c'est
  // l'identifiant qui fait foi, et lui seul survit à un renommage.
  if (data.table === "produit" && ("gamme" in champs || "sousGamme" in champs)) {
    const nomGamme = typeof champs.gamme === "string" ? champs.gamme : null;
    if (nomGamme) {
      const sous = typeof champs.sousGamme === "string" ? champs.sousGamme : null;
      const ids = await resoudreGamme(nomGamme, sous);
      champs.gammeId = ids.gammeId;
      if ("sousGamme" in champs) champs.sousGammeId = ids.sousGammeId;
    }
  }

  let avant: Record<string, string | null>;
  let entiteId: string;

  if (data.table === "fiche") {
    if (!data.id) throw new Error("Identifiant fiche manquant.");
    // `codeEtiquette` est unique en base : deux fiches ne peuvent pas porter le
    // même. Sans traduction, Marie reçoit le message brut de Postgres et ne sait
    // pas que le code est déjà pris ailleurs.
    try {
      ({ avant } = await updateFicheEtiquetteChamps(data.id, champs as ChampsFicheEditables));
    } catch (e) {
      if (estViolationUnicite(e) && "codeEtiquette" in champs) {
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
