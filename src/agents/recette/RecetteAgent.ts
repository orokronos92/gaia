import { z } from "zod";
import { BaseAgent, type LLMProvider } from "../BaseAgent";
import {
  computeRecette,
  type RecetteInput,
  type RecetteCalculee,
} from "@/lib/business-rules/recette";

/**
 * Agent de Recette — fills the gap the CopilotAgent referenced (an "Agent de
 * Recette" that did not exist). It computes the QUID ingredient table.
 *
 * Frontier (SPEC-02 §2): every figure comes from the deterministic engine
 * (`computeRecette`). The LLM is invoked ONLY to phrase the textual ingredient
 * list — it never produces or alters a number.
 */

const IngredientCalculeSchema = z.object({
  codeArticle: z.string(),
  designation: z.string(),
  quantiteKg: z.number(),
  pourcentageBrut: z.number(),
  pourcentageEtiquette: z.number(),
  estDemeter: z.boolean(),
  estEquitable: z.boolean(),
  masquerEtiquette: z.boolean().default(false),
  ordreTri: z.number().int(),
});

/** Zod safety net on the assembled output, before use/persistence (CLAUDE.md §7). */
export const RecetteAgentOutputSchema = z.object({
  ingredients: z.array(IngredientCalculeSchema).min(1),
  totalKg: z.number().positive(),
  totalPourcentageEtiquette: z
    .number()
    .refine((v) => Math.abs(v - 100) < 0.001, {
      message: "Le total des pourcentages étiquette doit être égal à 100",
    }),
  demeter: z.object({
    pourcentageDemeter: z.number(),
    tranche: z.string(),
    consequenceEtiquetage: z.string(),
  }),
  listeIngredientsSuggeree: z.string().optional(),
});

export type RecetteAgentInput = RecetteInput;
export type RecetteAgentOutput = z.infer<typeof RecetteAgentOutputSchema>;

export class RecetteAgent extends BaseAgent {
  constructor(llmProvider?: LLMProvider) {
    super("RecetteAgent", llmProvider);
  }

  /**
   * Computes the recipe deterministically, then (if an LLM is configured)
   * suggests the textual ingredient list. A failed LLM call never invalidates
   * the numeric result.
   */
  async execute(input: RecetteAgentInput): Promise<RecetteAgentOutput> {
    const calc = computeRecette(input);

    let listeIngredientsSuggeree: string | undefined;
    if (this.llmProvider) {
      try {
        listeIngredientsSuggeree = await this.genererListeIngredients(calc);
      } catch (error) {
        this.logWarn(
          "Génération LLM de la liste d'ingrédients échouée — résultat numérique conservé.",
          error
        );
      }
    }

    const output = { ...calc, listeIngredientsSuggeree };
    return RecetteAgentOutputSchema.parse(output);
  }

  /**
   * LLM phrasing only — the model receives already-computed figures and must
   * not change them. Output is validated as a non-empty string.
   */
  private async genererListeIngredients(
    calc: RecetteCalculee
  ): Promise<string> {
    const lignes = [...calc.ingredients]
      .sort((a, b) => a.ordreTri - b.ordreTri)
      .map(
        (i) =>
          `- ${i.designation} : ${i.pourcentageEtiquette}%` +
          (i.estDemeter ? " (Demeter)" : "") +
          (i.estEquitable ? " (équitable)" : "")
      )
      .join("\n");

    const systemPrompt = `Tu es l'Agent de Recette de GaïaLabel. Tu rédiges la liste d'ingrédients réglementaire (INCO/QUID) en français.
RÈGLES STRICTES :
1. N'effectue AUCUN calcul. Les pourcentages te sont fournis et sont définitifs.
2. Conserve les pourcentages exactement tels quels, dans l'ordre décroissant fourni.
3. Réponds uniquement par la liste d'ingrédients formatée, sans commentaire.`;

    const userContent = `Ingrédients (ordre décroissant, pourcentages définitifs) :\n${lignes}\n\nRédige la liste d'ingrédients.`;

    const text = await this.generateResponse(systemPrompt, userContent);
    return z.string().min(1).parse(text.trim());
  }
}

export default RecetteAgent;
