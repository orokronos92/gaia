/**
 * Recette extraction — the authoritative composition, read rather than guessed.
 *
 * The R&D recette sheet decides the ingredient list, the QUID figures and the
 * Demeter / fair-trade claims. It used to be flattened to tab-separated text and
 * handed to the LLM, which had to reconstruct the column grid from a header the
 * flattening had broken into three lines. It got the ticks wrong about one
 * import in three: TA602's three fair-trade ticks came back as Demeter ticks,
 * which put "**" on three ingredients and claimed a 77 % Demeter recipe that
 * does not exist.
 *
 * So the workbook is now READ by cell address (`lireFicheRecetteXlsx`), and the
 * LLM is only a fallback for a layout the reader does not recognise. In that
 * fallback the certification ticks are NOT guessed — a wrong `true` travels
 * silently all the way onto a label, so the degraded path reports "no tick" and
 * flags itself for Marie instead.
 *
 * Per the decision (2026-06-09-reconciliation-sources) the figures still come
 * from `computeRecette`, never from the model; JDG's own "% pour liste
 * d'ingrédient" column is imported alongside as a control, not as the truth.
 */

import { z } from "zod";
import {
  computeRecette,
  type IngredientRecetteInput,
  type RecetteCalculee,
} from "@/lib/business-rules/recette";
import { lireFicheRecetteXlsx, type FicheRecetteLue } from "@/lib/recette/xlsx-lecteur";
import { callMistral, type CallMeta } from "../mistral-call";
import { TEXT_MODEL } from "../models";
import { xlsxVersTexte } from "./xlsx-texte";

const PRECISION_PAR_DEFAUT = 0.5 as const;

/** Below this the two percentages are the same number, not a divergence. */
const TOLERANCE_ECART = 0.001;

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
  version: z.string().nullable().optional(),
  descriptifModification: z.string().nullable().optional(),
  raisonModification: z.string().nullable().optional(),
  incidenceEtiquetage: z.boolean().nullable().optional(),
  ingredients: z.array(IngredientExtrait),
});
export type RecetteExtraction = z.infer<typeof RecetteExtractionSchema>;

/** How the composition was obtained — persisted, so Marie can tell them apart. */
export type SourceExtractionRecette = "DETERMINISTE" | "IA_DEGRADEE";

/** One line where our QUID rounding differs from the sheet's own label column. */
export interface EcartPourcentage {
  codeArticle: string | null;
  designation: string;
  /** Our engine — the reference (SPEC-02). */
  calcule: number;
  /** JDG's "% pour liste d'ingrédient" column. */
  fiche: number;
}

export interface RecetteImportee {
  calc: RecetteCalculee;
  source: SourceExtractionRecette;
  version?: string;
  developpeur?: string;
  date?: Date;
  saveurOrigine?: string;
  descriptifModification?: string;
  raisonModification?: string;
  /** null / undefined = the form carries no answer, which is not "non". */
  incidenceEtiquetage?: boolean | null;
  ecartsPourcentage: EcartPourcentage[];
  anomalies: string[];
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
  "ingredients": [
    { "codeArticle": "string|null", "designation": "string", "quantiteKg": number|null,
      "pourcentage": number|null }
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
- "descriptifModification" / "raisonModification" : les lignes correspondantes de la
  fiche de modification, si présentes. null sinon.
- N'invente JAMAIS un chiffre. Ignore les lignes de total, d'en-tête et les lignes vides.
- Une ligne = un ingrédient réel de la recette.
- NE te prononce PAS sur les cases DEMETER et COMMERCE ÉQUITABLE : elles ne sont
  pas lisibles de façon fiable dans ce texte aplati, elles sont traitées ailleurs.

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

/** Read lines → engine input, keeping the sheet's own kg (or % as a fallback). */
function ficheVersInput(fiche: FicheRecetteLue): IngredientRecetteInput[] | null {
  const lignes = fiche.tableau.lignes;
  if (lignes.length === 0) return null;

  const tousKg = lignes.every((l) => typeof l.quantiteKg === "number" && l.quantiteKg > 0);
  const tousPct = lignes.every((l) => typeof l.pourcentageSource === "number" && l.pourcentageSource > 0);
  if (!tousKg && !tousPct) return null;

  return lignes.map((l) => ({
    codeArticle: (l.codeArticle ?? "").trim(),
    designation: l.designation,
    estBio: true,
    quantiteKg: tousKg ? (l.quantiteKg as number) : (l.pourcentageSource as number),
    estDemeter: l.estDemeter,
    estEquitable: l.estEquitable,
  }));
}

/**
 * Our rounding against JDG's own label column. Ours is the reference; a
 * divergence is a question for Marie, not a correction to apply silently.
 */
function comparerPourcentages(
  calc: RecetteCalculee,
  fiche: FicheRecetteLue
): EcartPourcentage[] {
  const cle = (code: string | null, designation: string) =>
    (code ?? "").trim() !== "" ? (code as string).trim() : designation.trim();
  const parCle = new Map(
    fiche.tableau.lignes.map((l) => [cle(l.codeArticle, l.designation), l.pourcentageEtiquetteSource])
  );

  const ecarts: EcartPourcentage[] = [];
  for (const ingredient of calc.ingredients) {
    const source = parCle.get(cle(ingredient.codeArticle, ingredient.designation));
    if (typeof source !== "number") continue;
    if (Math.abs(source - ingredient.pourcentageEtiquette) <= TOLERANCE_ECART) continue;
    ecarts.push({
      codeArticle: ingredient.codeArticle || null,
      designation: ingredient.designation,
      calcule: ingredient.pourcentageEtiquette,
      fiche: source,
    });
  }
  return ecarts;
}

/** Fallback path: the model reads the text, but never a certification tick. */
async function extraireParIA(
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

  // Les coches ne sont jamais devinées : un « true » inventé devient un « ** »
  // sur l'étiquette et une mention Demeter exigée à l'audit, sans bruit.
  const neutralises = ingredients.map((i) => ({ ...i, estDemeter: false, estEquitable: false }));

  return {
    calc: computeRecette({ ingredients: neutralises, precisionArrondi: PRECISION_PAR_DEFAUT }),
    source: "IA_DEGRADEE",
    version: extraction.version?.trim() || undefined,
    descriptifModification: extraction.descriptifModification?.trim() || undefined,
    raisonModification: extraction.raisonModification?.trim() || undefined,
    incidenceEtiquetage: null,
    ecartsPourcentage: [],
    anomalies: [
      "Classeur non reconnu : composition lue par l'IA. Les mentions Demeter et commerce équitable n'ont pas été lues — à renseigner à la main.",
    ],
  };
}

/**
 * Extracts the recette from an Excel buffer. Reads the workbook directly when
 * its layout is recognised, and only then falls back to the model. Returns null
 * if nothing usable came out; throws only on a hard LLM/parse failure in the
 * fallback — the caller treats that as best-effort.
 */
export async function extraireRecetteDepuisXlsx(
  buffer: ArrayBuffer,
  meta?: Omit<CallMeta, "agent">
): Promise<RecetteImportee | null> {
  const fiche = lireFicheRecetteXlsx(buffer);
  const ingredients = fiche ? ficheVersInput(fiche) : null;

  if (fiche && ingredients) {
    const calc = computeRecette({ ingredients, precisionArrondi: PRECISION_PAR_DEFAUT });
    return {
      calc,
      source: "DETERMINISTE",
      version: fiche.versionRetenue ?? undefined,
      developpeur: fiche.entete.developpeur ?? undefined,
      date: fiche.entete.date ?? undefined,
      saveurOrigine: fiche.entete.saveurOrigine ?? undefined,
      descriptifModification: fiche.entete.descriptifModification ?? undefined,
      raisonModification: fiche.entete.raisonModification ?? undefined,
      incidenceEtiquetage: fiche.incidenceEtiquetage,
      ecartsPourcentage: comparerPourcentages(calc, fiche),
      anomalies: fiche.anomalies,
    };
  }

  return extraireParIA(buffer, meta);
}
