import { db } from "@/db";
import { knowledgeDocuments } from "@/db/schema";
import { cosineDistance, desc, sql } from "drizzle-orm";
import { Mistral } from "@mistralai/mistralai";
import { z } from "zod";

export interface SearchResult {
    content: string;
    documentName: string;
    similarity: number;
}

/** Mistral text-embedding model and its fixed output dimension (matches the
 *  `vector(1024)` column on `knowledge_documents`). Mistral only (CLAUDE.md §7). */
const EMBEDDING_MODEL = "mistral-embed";
const EMBEDDING_DIM = 1024;

/** Minimum cosine similarity for a chunk to count as relevant (RAG lot C).
 *  Conservative default; tune empirically once a real corpus is ingested. */
const RELEVANCE_THRESHOLD = 0.4;

const EmbeddingSchema = z.array(z.number()).length(EMBEDDING_DIM);

export class RAGService {

    private static mistral: InstanceType<typeof Mistral> | null = null;

    private static client(): InstanceType<typeof Mistral> {
        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey) {
            throw new Error("MISTRAL_API_KEY manquante — embeddings indisponibles");
        }
        if (!this.mistral) this.mistral = new Mistral({ apiKey });
        return this.mistral;
    }

    /**
     * Real semantic embedding via Mistral (`mistral-embed`, 1024 dims). Replaces
     * the former char-code placeholder. The output is Zod-validated before use
     * (CLAUDE.md §7); throws on a missing key or a malformed response — callers
     * (ingest/search) degrade gracefully on throw.
     */
    private static async generateEmbedding(text: string): Promise<number[]> {
        const res = await this.client().embeddings.create({
            model: EMBEDDING_MODEL,
            inputs: text,
        });
        return EmbeddingSchema.parse(res.data?.[0]?.embedding);
    }

    /**
     * Splits a large document into smaller chunks (paragraphs) to store in the Vector DB.
     */
    private static chunkText(text: string, maxWordsPerChunk: number = 200): string[] {
        const paragraphs = text.split(/\n\s*\n/);
        const chunks: string[] = [];
        let currentChunk = "";

        for (const p of paragraphs) {
            const wordCount = (currentChunk + p).split(/\s+/).length;
            if (wordCount > maxWordsPerChunk) {
                if (currentChunk) chunks.push(currentChunk.trim());
                currentChunk = p;
            } else {
                currentChunk += "\n\n" + p;
            }
        }
        if (currentChunk) chunks.push(currentChunk.trim());

        return chunks.filter(c => c.length > 20); // removing extremely short meaningless chunks
    }

    /**
     * Ingests a raw text document into the Vector Database.
     */
    public static async ingestDocument(documentName: string, rawText: string, metadata?: any): Promise<number> {
        const chunks = this.chunkText(rawText);

        // Let's process chunk by chunk to avoid rate limits when hooked up to a real API
        let ingestedCount = 0;
        for (const chunk of chunks) {
            try {
                const embedding = await this.generateEmbedding(chunk);
                await db.insert(knowledgeDocuments).values({
                    documentName,
                    contentChunk: chunk,
                    embedding,
                    metadata: metadata || {},
                });
                ingestedCount++;
            } catch (err) {
                console.error(`Error ingesting chunk from ${documentName}:`, err);
            }
        }

        return ingestedCount;
    }

    /**
     * Semantic search over the vector store (RAG lot C). Returns only chunks
     * whose cosine similarity to the query exceeds `minSimilarity` — so an
     * irrelevant query yields an EMPTY set rather than the 3 closest-but-useless
     * chunks. That empty signal is what lets callers (CopilotAgent) report
     * "aucun voisin pertinent / faible confiance". Tune the threshold once a real
     * corpus is ingested.
     */
    public static async searchContext(
        query: string,
        limit: number = 3,
        minSimilarity: number = RELEVANCE_THRESHOLD
    ): Promise<SearchResult[]> {
        try {
            const queryEmbedding = await this.generateEmbedding(query);

            const distance = cosineDistance(knowledgeDocuments.embedding, queryEmbedding);
            const similarity = sql<number>`1 - (${distance})`;

            const results = await db.select({
                content: knowledgeDocuments.contentChunk,
                documentName: knowledgeDocuments.documentName,
                similarity,
            })
                .from(knowledgeDocuments)
                .where(sql`1 - (${distance}) > ${minSimilarity}`)
                .orderBy(desc(similarity))
                .limit(limit);

            return results as SearchResult[];
        } catch (error) {
            console.error("Vector search failed:", error);
            // Fallback: return empty if vector search fails (e.g. pgvector not fully running)
            return [];
        }
    }

    /**
     * Formats the RAG search results into a clean string to inject into an LLM system prompt.
     */
    public static formatContextForPrompt(results: SearchResult[]): string {
        if (!results || results.length === 0) return "Aucune documentation spécifique trouvée.";

        return results.map((r, i) => `[Source ${i + 1}: ${r.documentName}]\n${r.content}`).join("\n\n---\n\n");
    }
}
