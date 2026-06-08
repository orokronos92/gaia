import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { knowledgeDocuments } from "@/db/schema";

export interface KnowledgeDocumentSummary {
  documentName: string;
  chunkCount: number;
  ingestedAt: Date;
}

/**
 * Lists the RAG knowledge base grouped by source document (one row per
 * `document_name`, with its chunk count and ingestion date). Drives the real
 * "Corpus Actif" view on the Connaissances page. Returns [] when empty.
 */
export const listKnowledgeDocuments = cache(
  async (): Promise<KnowledgeDocumentSummary[]> => {
    return db
      .select({
        documentName: knowledgeDocuments.documentName,
        chunkCount: sql<number>`count(*)::int`,
        ingestedAt: sql<Date>`min(${knowledgeDocuments.creeLe})`,
      })
      .from(knowledgeDocuments)
      .groupBy(knowledgeDocuments.documentName)
      .orderBy(sql`min(${knowledgeDocuments.creeLe}) desc`);
  }
);

/** Removes every chunk of a document from the RAG store. Returns the count deleted. */
export async function deleteKnowledgeDocument(
  documentName: string
): Promise<number> {
  const deleted = await db
    .delete(knowledgeDocuments)
    .where(eq(knowledgeDocuments.documentName, documentName))
    .returning({ id: knowledgeDocuments.id });
  return deleted.length;
}
