import * as xlsx from "xlsx";
import { IngredientInput } from "../business-rules/rounding";

export interface ParsedRecipe {
    codeArticle: string;
    designation: string;
    version: string;
    ingredients: IngredientInput[];
}

export async function parseExcelRecipeBuffer(buffer: Buffer): Promise<ParsedRecipe> {
    try {
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON array of arrays
        const data: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        const ingredients: IngredientInput[] = [];
        let codeArticle = "Inconnu";
        let designation = "Inconnu";
        let version = "V.0";

        for (let r = 0; r < data.length; r++) {
            const row = data[r];
            if (!row || !row.length) continue;

            const firstCell = String(row[0] || "").toLowerCase().trim();

            if (firstCell.includes("code article") && row.length > 1) {
                codeArticle = String(row[1]);
            } else if (firstCell.includes("désignation") && row.length > 1) {
                designation = String(row[1]);
            }

            // Very naive logic to catch ingredient rows for PoC (detecting numbers in Kg col)
            // Assuming column 0 is Code, 1 is Name, 2 is format (kg), 3 is Amount
            if (row.length >= 4) {
                const qty = parseFloat(row[3]);
                if (!isNaN(qty) && qty > 0 && typeof row[1] === "string" && row[1].trim() !== "") {
                    ingredients.push({
                        name: row[1].trim(),
                        qtyKg: qty
                    });
                }
            }
        }

        return {
            codeArticle,
            designation,
            version,
            ingredients
        };
    } catch (error) {
        console.error("Erreur lors du parsing Excel:", error);
        throw new Error("Impossible de parser le fichier Excel de la recette.");
    }
}
