import mammoth from "mammoth";

export async function extractTextFromWordBuffer(buffer: Buffer): Promise<string> {
    try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value || "";
    } catch (error) {
        console.error("Erreur lors de l'extraction DOCX:", error);
        throw new Error("Impossible d'extraire le texte de ce fichier Word.");
    }
}
