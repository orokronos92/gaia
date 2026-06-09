/**
 * Structured recette extraction (Lot 1 — source reconciliation).
 *
 * The R&D recette sheet (Excel) is the authoritative composition. This is a
 * SECOND, dedicated AI call — separate from the dégustation extraction — that
 * turns the tabular sheet into structured ingredient lines. Per the decision
 * (2026-06-09-reconciliation-sources):
 *   - the LLM extracts the kg (flexible across sheet layouts),
 *   - `computeRecette` recomputes the %  (figures never come from the LLM),
 *   - the result is persisted as a DRAFT recette; Marie validates later.
 */

import { Mistral } from "@mistralai/mistralai";
import { z } from "zod";
import * as xlsx from "xlsx";
import {
  computeRecette,
  type IngredientRecetteInput,
  type RecetteCalculee,
} from "@/lib/business-rules/recette";

const RECETTE_MODEL = "mistral-large-latest";
const PRECISION_PAR_DEFAUT = 0.5 as const;

const IngredientExtrait = z.object({
  designation: z.string().min(1),
  quantiteKg: z.number().nullable().optional(),
  pourcentage: z.number().nullable().optional(),
  estDemeter: z.boolean().nullable().optional(),
  estEquitable: z.boolean().nullable().optional(),
});
export const RecetteExtractionSchema = z.object({
  ingredients: z.array(IngredientExtrait),
});
export type RecetteExtraction = z.infer<typeof RecetteExtractionSchema>;

let _mistral: Mistral | null = null;
function getClient(): Mistral {
  if (!_mistral) _mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY ?? "" });
  return _mistral;
}

/** Excel buffer → tab-separated text, one block per sheet. */
function xlsxVersTexte(buffer: ArrayBuffer): string {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  let texte = "";
  for (const nom of workbook.SheetNames) {
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[nom], { header: 1 }) as unknown[][];
    texte += `\nFeuille: ${nom}\n`;
    texte += rows
      .filter((r) => r.some((c) => c !== null && c !== undefined && c !== ""))
      .map((r) => r.join("\t"))
      .join("\n");
  }
  return texte;
}

function buildPrompt(texte: string): string {
  return `Tu es un extracteur de recette pour Les Jardins de Gaïa (thés/infusions bio).
À partir du tableau Excel ci-dessous (fiche recette R&D), extrais la liste des ingrédients.
Retourne UNIQUEMENT un objet JSON valide, sans markdown ni commentaire :
{
  "ingredients": [
    { "designation": "string", "quantiteKg": number|null, "pourcentage": number|null, "estDemeter": boolean, "estEquitable": boolean }
  ]
}
RÈGLES :
- "quantiteKg" : la masse en kg de la colonne quantité (accepte la virgule décimale). null si absente.
- "pourcentage" : le % de la colonne pourcentage si présent. null sinon.
- "estDemeter" / "estEquitable" : true si l'ingrédient est marqué Demeter / équitable, sinon false.
- N'invente JAMAIS un chiffre. Ignore les lignes de total, d'en-tête et les lignes vides.
- Une ligne = un ingrédient réel de la recette.

TABLEAU :
${texte.substring(0, 16000)}`;
}

/**
 * Pure mapping: extracted ingredients → engine input. Prefers real kg; if no kg
 * but a % is present, uses the % on a notional base (kg relative). Returns null
 * unless EVERY ingredient has a usable quantity (a partial recette is not
 * persisted — the tab falls back to the text pre-fill, Marie completes).
 */
export function recetteExtraiteVersInput(
  extraction: RecetteExtraction
): IngredientRecetteInput[] | null {
  const lignes = extraction.ingredients;
  if (lignes.length === 0) return null;

  const tousKg = lignes.every((i) => typeof i.quantiteKg === "number" && i.quantiteKg > 0);
  const tousPct = lignes.every((i) => typeof i.pourcentage === "number" && i.pourcentage > 0);
  if (!tousKg && !tousPct) return null;

  return lignes.map((i) => ({
    codeArticle: "",
    designation: i.designation,
    quantiteKg: tousKg ? (i.quantiteKg as number) : (i.pourcentage as number),
    estDemeter: !!i.estDemeter,
    estEquitable: !!i.estEquitable,
  }));
}

/**
 * Extracts the recette from an Excel buffer and returns the computed result
 * (kg from the LLM, % from the engine), or null if nothing usable. Throws only
 * on a hard LLM/parse failure — the caller treats it as best-effort.
 */
export async function extraireRecetteDepuisXlsx(
  buffer: ArrayBuffer
): Promise<RecetteCalculee | null> {
  const texte = xlsxVersTexte(buffer);
  if (texte.trim() === "") return null;

  const response = await getClient().chat.complete({
    model: RECETTE_MODEL,
    messages: [
      { role: "system", content: "Tu renvoies UNIQUEMENT un objet JSON valide, sans markdown." },
      { role: "user", content: buildPrompt(texte) },
    ],
    responseFormat: { type: "json_object" },
    maxTokens: 2000,
    temperature: 0.05,
  });

  const raw = (response.choices?.[0]?.message?.content as string) ?? "{}";
  const extraction = RecetteExtractionSchema.parse(JSON.parse(raw));

  const ingredients = recetteExtraiteVersInput(extraction);
  if (!ingredients) return null;

  return computeRecette({ ingredients, precisionArrondi: PRECISION_PAR_DEFAUT });
}
