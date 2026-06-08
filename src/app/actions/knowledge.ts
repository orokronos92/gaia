"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { deleteKnowledgeDocument } from "@/db/queries/knowledge";

const SupprimerSchema = z.object({ documentName: z.string().min(1) });

/**
 * Removes a document (all its chunks) from the RAG knowledge base (RAG lot D).
 * Auth-gated; the corpus view is revalidated so the list refreshes.
 */
export async function supprimerDocumentAction(input: unknown) {
  const { documentName } = SupprimerSchema.parse(input);

  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const deleted = await deleteKnowledgeDocument(documentName);
  revalidatePath("/connaissances");
  return { ok: true as const, deleted };
}
