"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { deleteKnowledgeDocument } from "@/db/queries/knowledge";
import { writeAuditLog } from "@/db/queries/audit-logs";

const SupprimerSchema = z.object({ documentName: z.string().min(1) });

/**
 * Removes a document (all its chunks) from the RAG knowledge base (RAG lot D).
 * Auth-gated; logged to the audit trail (lot E); the corpus view is revalidated.
 */
export async function supprimerDocumentAction(input: unknown) {
  const { documentName } = SupprimerSchema.parse(input);

  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const deleted = await deleteKnowledgeDocument(documentName);

  await writeAuditLog({
    typeEntite: "knowledge_document",
    entiteId: documentName,
    action: "RAG_SUPPRESSION",
    utilisateurId: session.user.id,
    changements: { chunksSupprimes: deleted },
  });

  revalidatePath("/connaissances");
  return { ok: true as const, deleted };
}
