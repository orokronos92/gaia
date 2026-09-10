"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { writeAuditLog } from "@/db/queries/audit-logs";
import {
  basculerActivite,
  definirObligation,
  creerGamme,
  creerSousGamme,
  renommerGamme,
  renommerSousGamme,
} from "@/db/queries/gammes";

/**
 * Le référentiel des gammes — création, renommage, retrait.
 *
 * La gamme décide de contrôles réglementaires (mention Anemos, ligne de don des
 * Engagés). Ce qui s'y écrit engage donc plus qu'un libellé, et chaque geste est
 * journalisé au nom de qui l'a fait.
 */

const Nom = z.string().trim().min(2).max(120);
const CreerGamme = z.object({ nom: Nom });
const CreerSousGamme = z.object({ gammeId: z.string().uuid(), nom: Nom });
const Renommer = z.object({ id: z.string().uuid(), nom: Nom });
const Basculer = z.object({
  table: z.enum(["gamme", "sousGamme"]),
  id: z.string().uuid(),
  active: z.boolean(),
});

const Obligation = z.object({
  id: z.string().uuid(),
  mention: z.enum(["anemos", "engages"]),
  exige: z.boolean(),
});

export interface ResultatGamme {
  ok: boolean;
  error?: string;
}

const CHEMIN = "/referentiels/gammes";

/**
 * Une contrainte d'unicité violée se dit en français, pas en SQL.
 *
 * Le code Postgres n'est pas porté par l'erreur rendue : l'ORM l'enveloppe, et
 * `23505` se trouve dans sa cause. À ne regarder que le premier niveau, on
 * retombait sur `e.message` — c'est-à-dire la requête `insert into "gammes"…`
 * affichée telle quelle à la Qualité.
 *
 * Et par principe, aucun message d'erreur technique ne remonte à l'écran : ce
 * qu'on ne sait pas traduire se dit simplement, le détail reste dans les
 * journaux du serveur.
 */
function traduireErreur(e: unknown, nom: string): string {
  for (let cause: unknown = e, profondeur = 0; cause && profondeur < 5; profondeur++) {
    if (typeof cause !== "object") break;
    if ("code" in cause && (cause as { code: unknown }).code === "23505") {
      return `« ${nom} » existe déjà.`;
    }
    cause = (cause as { cause?: unknown }).cause;
  }
  console.error("[referentiel-gammes] échec d'écriture", e);
  return "Échec de l'enregistrement.";
}

async function journaliser(
  action: string,
  utilisateurId: string,
  changements: Record<string, unknown>
): Promise<void> {
  await writeAuditLog({
    typeEntite: "referentiel_gamme",
    entiteId: String(changements.id ?? changements.nom ?? "—"),
    action,
    utilisateurId,
    changements,
  });
}

export async function creerGammeAction(input: unknown): Promise<ResultatGamme> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non autorisé." };
  const data = CreerGamme.parse(input);
  try {
    const { id } = await creerGamme(data.nom);
    await journaliser("GAMME_CREEE", session.user.id, { id, nom: data.nom });
  } catch (e) {
    return { ok: false, error: traduireErreur(e, data.nom) };
  }
  revalidatePath(CHEMIN);
  return { ok: true };
}

export async function creerSousGammeAction(input: unknown): Promise<ResultatGamme> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non autorisé." };
  const data = CreerSousGamme.parse(input);
  try {
    const { id } = await creerSousGamme(data.gammeId, data.nom);
    await journaliser("SOUS_GAMME_CREEE", session.user.id, { id, nom: data.nom, gammeId: data.gammeId });
  } catch (e) {
    return { ok: false, error: traduireErreur(e, data.nom) };
  }
  revalidatePath(CHEMIN);
  return { ok: true };
}

/**
 * Renommer emporte les produits qui portaient l'ancien libellé : tant qu'ils
 * désignent leur gamme par son nom, les laisser derrière les détacherait.
 */
export async function renommerGammeAction(input: unknown): Promise<ResultatGamme> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non autorisé." };
  const data = Renommer.parse(input);
  try {
    await renommerGamme(data.id, data.nom);
    await journaliser("GAMME_RENOMMEE", session.user.id, { id: data.id, nom: data.nom });
  } catch (e) {
    return { ok: false, error: traduireErreur(e, data.nom) };
  }
  revalidatePath(CHEMIN);
  revalidatePath("/produits");
  return { ok: true };
}

export async function renommerSousGammeAction(input: unknown): Promise<ResultatGamme> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non autorisé." };
  const data = Renommer.parse(input);
  try {
    await renommerSousGamme(data.id, data.nom);
    await journaliser("SOUS_GAMME_RENOMMEE", session.user.id, { id: data.id, nom: data.nom });
  } catch (e) {
    return { ok: false, error: traduireErreur(e, data.nom) };
  }
  revalidatePath(CHEMIN);
  revalidatePath("/produits");
  return { ok: true };
}

export async function basculerActiviteAction(input: unknown): Promise<ResultatGamme> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non autorisé." };
  const data = Basculer.parse(input);
  await basculerActivite(data.table, data.id, data.active);
  await journaliser(data.active ? "GAMME_REACTIVEE" : "GAMME_RETIREE", session.user.id, {
    id: data.id,
    table: data.table,
  });
  revalidatePath(CHEMIN);
  return { ok: true };
}

/**
 * Coche ou décoche une obligation d'étiquetage portée par la gamme.
 *
 * C'est ce qui remplace la recherche de « voile » ou « engag » dans son libellé.
 * Le geste engage un contrôle réglementaire : il est journalisé au nom de qui
 * l'a fait, comme une décision, pas comme un réglage.
 */
export async function definirObligationAction(input: unknown): Promise<ResultatGamme> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non autorisé." };
  const data = Obligation.parse(input);
  await definirObligation(data.id, data.mention, data.exige);
  await journaliser("GAMME_OBLIGATION_MODIFIEE", session.user.id, {
    id: data.id,
    mention: data.mention,
    exige: data.exige,
  });
  revalidatePath(CHEMIN);
  revalidatePath("/etiquettes");
  return { ok: true };
}
