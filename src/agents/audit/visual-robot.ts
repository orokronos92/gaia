/**
 * Visual robot — perception only (Mistral pixtral).
 *
 * Sends the BAT PDF to Mistral as-is via `document_url` (no PDF→PNG conversion —
 * the model renders the artwork natively) and reports, per logo, PRESENT /
 * ABSENT / INCERTAIN. It judges NOTHING: conformity is decided by pure code in
 * `lib/audit/visual/pictos`. Output is Zod-validated before leaving the agent.
 */

import { Mistral } from "@mistralai/mistralai";
import { z } from "zod";

import { PICTOS_A_DETECTER, type Presence } from "@/lib/audit/visual/pictos";

const VISUAL_MODEL = "pixtral-large-latest";

const PRESENCES = ["PRESENT", "ABSENT", "INCERTAIN"] as const;
const DetectionSchema = z.object({
  pictos: z.array(z.object({ cle: z.string(), presence: z.enum(PRESENCES) })),
});

export interface VisualRobotResult {
  presences: Record<string, Presence>;
  tokensUsed: number;
}

/** Detects the checklist logos on a single BAT face (one PDF, base64). */
export async function detectPictos(pdfBase64: string): Promise<VisualRobotResult> {
  const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY ?? "" });

  const liste = PICTOS_A_DETECTER.map((p) => `- ${p.cle} : ${p.desc}`).join("\n");
  const instruction = `Tu inspectes une étiquette alimentaire (le PDF joint). Pour CHAQUE logo ci-dessous, indique s'il est PRESENT, ABSENT ou INCERTAIN sur l'étiquette. N'invente rien : si tu hésites, réponds INCERTAIN.
${liste}

Réponds STRICTEMENT en JSON, sans aucun autre texte :
{"pictos":[{"cle":"EUROFEUILLE","presence":"PRESENT"}, ...]}`;

  const response = await client.chat.complete({
    model: VISUAL_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "document_url", documentUrl: `data:application/pdf;base64,${pdfBase64}`, documentName: "bat.pdf" },
          { type: "text", text: instruction },
        ],
      },
    ],
    maxTokens: 600,
    temperature: 0,
  });

  const raw = (response.choices?.[0]?.message?.content as string) ?? "";
  const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed = DetectionSchema.parse(JSON.parse(clean));

  const presences: Record<string, Presence> = {};
  for (const p of parsed.pictos) presences[p.cle] = p.presence;
  return { presences, tokensUsed: response.usage?.totalTokens ?? 0 };
}
