import { describe, it, expect, vi } from 'vitest';
import { ImportWorker } from '../../agents/imports/importWorker';

// Minimal mock to avoid calling the real Database and real API during tests
vi.mock('@/db', () => ({
    db: {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue([{ id: 'mocked-id' }]),
    }
}));
vi.mock('@/db/schema', () => ({
    produits: {}, fichesEtiquettes: {}, recettes: {}, ingredientsRecette: {}, knowledgeDocuments: {}
}));
vi.mock('../../src/agents/knowledge/RAGService', () => ({
    RAGService: {
        searchContext: vi.fn().mockResolvedValue([]),
        formatContextForPrompt: vi.fn().mockReturnValue('mock context'),
    }
}));

describe('ImportWorker Logic Verification', () => {

    it('should correctly orchestrate the extraction and fallback to deterministic JSON schema if API is mocked', async () => {
        const dummyDocx = new ArrayBuffer(0);
        const dummyXlsx = new ArrayBuffer(0);

        // Mock the internal methods to avoid parsing real ArrayBuffers mapping to mammoth/xlsx
        vi.spyOn(ImportWorker as any, 'extractDocxText').mockResolvedValue('Fiche Dégustation: Thé Vert menthe');
        vi.spyOn(ImportWorker as any, 'extractExcelData').mockReturnValue([{ Ing: 'Thé', pct: 90 }]);

        const result = await ImportWorker.processImport({ docxBuffer: dummyDocx, xlsxBuffer: dummyXlsx }, 'user-123');

        expect(result.status).toBe('SUCCESS');
        expect(result.ficheId).toBeDefined();
        expect(result.produitId).toBeDefined();

        // Ensure the dummy fallback returns a valid JSON matching the PRD schema
        expect(result.parsedFields).toHaveProperty('codeArticle');
        expect(result.parsedFields).toHaveProperty('designation');
        expect(result.parsedFields).toHaveProperty('aromatise');
        expect(result.parsedFields).toHaveProperty('labelsClient');
    });
});
