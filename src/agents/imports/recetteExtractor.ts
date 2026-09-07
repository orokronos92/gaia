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

import { z } from "zod";
import * as xlsx from "xlsx";
import {
  computeRecette,
  type IngredientRecetteInput,
  type RecetteCalculee,
} from "@/lib/business-rules/recette";
import { callMistral, type CallMeta } from "../mistral-call";
import { TEXT_MODEL } from "../models";

const PRECISION_PAR_DEFAUT = 0.5 as const;

const IngredientExtrait = z.object({
  /** Code article JDG (HB170, TN592…) — clé de jointure du référentiel matière. */
  codeArticle: z.string().nullable().optional(),
  designation: z.string().min(1),
  quantiteKg: z.number().nullable().optional(),
  pourcentage: z.number().nullable().optional(),
  estDemeter: z.boolean().nullable().optional(),
  estEquitable: z.boolean().nullable().optional(),
});
export const RecetteExtractionSchema = z.object({
  /** Version retenue, telle qu'écrite dans le classeur ("V.2"). */
  version: z.string().nullable().optional(),
  descriptifModification: z.string().nullable().optional(),
  raisonModification: z.string().nullable().optional(),
  incidenceEtiquetage: z.boolean().nullable().optional(),
  ingredients: z.array(IngredientExtrait),
});
export type RecetteExtraction = z.infer<typeof RecetteExtractionSchema>;

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
Le classeur ci-dessous contient PLUSIEURS onglets et PLUSIEURS tableaux. Tu dois
d'abord identifier LA recette EN VIGUEUR, puis extraire ses ingrédients.

Retourne UNIQUEMENT un objet JSON valide, sans markdown ni commentaire :
{
  "version": "string|null",
  "descriptifModification": "string|null",
  "raisonModification": "string|null",
  "incidenceEtiquetage": true|false|null,
  "ingredients": [
    { "codeArticle": "string|null", "designation": "string", "quantiteKg": number|null,
      "pourcentage": number|null, "estDemeter": boolean, "estEquitable": boolean }
  ]
}

CHOIX DE LA VERSION — la règle la plus importante :
- Une « FICHE DE MODIFICATION DE RECETTE » (ENR-PRO-024) contient DEUX tableaux :
  « VERSION RECETTE EN COURS : V.x » (l'ancienne) puis
  « VERSION NOUVELLE RECETTE : V.y » (celle qui entre en vigueur).
  → Prends TOUJOURS le tableau « VERSION NOUVELLE RECETTE ».
- Une « FICHE DE CREATION RECETTE » (ENR-PRO-023) ne contient qu'un tableau.
- Si le classeur a plusieurs onglets, retiens la version la PLUS RÉCENTE
  (numéro de version le plus élevé, ou date la plus récente).
- "version" : recopie l'étiquette de version retenue, ex. "V.2".

AUTRES CHAMPS :
- "codeArticle" : le code de la colonne CODE ARTICLE (HB170, TN592, EF231…). null si absent.
- "quantiteKg" : la masse en kg de la colonne quantité (accepte la virgule décimale). null si absente.
- "pourcentage" : le % de la colonne pourcentage si présent. null sinon.
- "estDemeter" / "estEquitable" : true si la case DEMETER / COMMERCE ÉQUITABLE porte
  une marque (x, X, oui…) pour CET ingrédient, sinon false.
- "descriptifModification" / "raisonModification" : les lignes correspondantes de la
  fiche de modification, si présentes. null sinon.
- "incidenceEtiquetage" : true si la fiche indique que la modification a une incidence
  sur l'ÉTIQUETAGE, false si elle indique le contraire, null si ce n'est pas renseigné.
- N'invente JAMAIS un chiffre. Ignore les lignes de total, d'en-tête et les lignes vides.
- Une ligne = un ingrédient réel de la recette.

CLASSEUR :
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
    codeArticle: (i.codeArticle ?? "").trim(),
    designation: i.designation,
    // Bio par défaut : la fiche recette ne porte aucune colonne BIO, c'est
    // implicite chez JDG. Marie corrige ligne par ligne si besoin.
    estBio: true,
    quantiteKg: tousKg ? (i.quantiteKg as number) : (i.pourcentage as number),
    estDemeter: !!i.estDemeter,
    estEquitable: !!i.estEquitable,
  }));
}

/**
 * What one recette workbook yields: the computed recipe plus the change record
 * around it. JDG's sheet is a "fiche de modification" that states its own reason
 * and whether the change touches the label — that reasoning is worth keeping.
 */
export interface RecetteImportee {
  calc: RecetteCalculee;
  version?: string;
  descriptifModification?: string;
  raisonModification?: string;
  incidenceEtiquetage?: boolean;
}

/**
 * Extracts the recette from an Excel buffer and returns the computed result
 * (kg from the LLM, % from the engine), or null if nothing usable. Throws only
 * on a hard LLM/parse failure — the caller treats it as best-effort.
 */
export async function extraireRecetteDepuisXlsx(
  buffer: ArrayBuffer,
  meta?: Omit<CallMeta, "agent">
): Promise<RecetteImportee | null> {
  const texte = xlsxVersTexte(buffer);
  if (texte.trim() === "") return null;

  const response = await callMistral({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: "Tu renvoies UNIQUEMENT un objet JSON valide, sans markdown." },
      { role: "user", content: buildPrompt(texte) },
    ],
    responseFormat: { type: "json_object" },
    maxTokens: 2000,
    temperature: 0.05,
  }, { agent: "IMPORT_RECETTE", ...meta });

  const raw = (response.choices?.[0]?.message?.content as string) ?? "{}";
  const extraction = RecetteExtractionSchema.parse(JSON.parse(raw));

  const ingredients = recetteExtraiteVersInput(extraction);
  if (!ingredients) return null;

  return {
    calc: computeRecette({ ingredients, precisionArrondi: PRECISION_PAR_DEFAUT }),
    version: extraction.version?.trim() || undefined,
    descriptifModification: extraction.descriptifModification?.trim() || undefined,
    raisonModification: extraction.raisonModification?.trim() || undefined,
    incidenceEtiquetage: extraction.incidenceEtiquetage ?? undefined,
  };
}
