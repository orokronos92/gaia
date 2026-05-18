// @ts-ignore
import pdfParse from 'pdf-parse';

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
    try {
        const data = await pdfParse(buffer);
        return data.text || "";
    } catch (error) {
        console.error("Erreur lors de l'extraction PDF:", error);
        throw new Error("Impossible d'extraire le texte de ce PDF.");
    }
}
