import { db } from "@/db";
import { knowledgeDocuments } from "@/db/schema";
import { cosineDistance, desc, sql } from "drizzle-orm";

export interface SearchResult {
    content: string;
    documentName: string;
    similarity: number;
}

export class RAGService {

    /**
     * Helper to generate embeddings. 
     * In a production environment, this should call an Embedding API (like OpenAI's text-embedding-ada-002, or a local transformers.js model).
     * Since Anthropic does not provide an embedding API and we don't have an OpenAI key configured,
     * this MVP returns a simulated 1536-dimensional vector.
     */
    private static async generateEmbedding(text: string): Promise<number[]> {
        // [MVP Placeholder] Simulating a vector based on content length and basic char codes
        // to have *some* variance, but it's not a real semantic embedding.
        const vector = new Array(1536).fill(0);
        for (let i = 0; i < Math.min(text.length, 1536); i++) {
            vector[i] = (text.charCodeAt(i) / 255) * 2 - 1; // Normalize roughly to [-1, 1]
        }
        return vector;
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
     * Searches the Vector Database for the most relevant context chunks given a query.
     */
    public static async searchContext(query: string, limit: number = 3): Promise<SearchResult[]> {
        try {
            // Generates the embedding for the search query
            const queryEmbedding = await this.generateEmbedding(query);

            // Computes the cosine distance between the query embedding and the stored document chunks
            const similarity = sql<number>`1 - (${cosineDistance(knowledgeDocuments.embedding, queryEmbedding)})`;

            // Gets the most similar results
            const results = await db.select({
                content: knowledgeDocuments.contentChunk,
                documentName: knowledgeDocuments.documentName,
                similarity
            })
                .from(knowledgeDocuments)
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
