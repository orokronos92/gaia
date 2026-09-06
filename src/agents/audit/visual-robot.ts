/**
 * Visual robot — perception only (Mistral vision).
 *
 * Sends the BAT PDF to Mistral as-is via `document_url` (no PDF→PNG conversion —
 * the model renders the artwork natively) and reports, per logo, PRESENT /
 * ABSENT / INCERTAIN. It judges NOTHING: conformity is decided by pure code in
 * `lib/audit/visual/pictos`. Output is Zod-validated before leaving the agent.
 */

import { z } from "zod";

import { PICTOS_A_DETECTER, type PictoDef, type Presence } from "@/lib/audit/visual/pictos";
import { callMistral, type AgentIA, type CallMeta } from "../mistral-call";
import { VISION_MODEL } from "../models";

const PRESENCES = ["PRESENT", "ABSENT", "INCERTAIN"] as const;
const DetectionSchema = z.object({
  pictos: z.array(z.object({ cle: z.string(), presence: z.enum(PRESENCES) })),
});

export interface VisualRobotResult {
  presences: Record<string, Presence>;
  tokensUsed: number;
}

/** One vision call over the BAT PDF asking for the presence of the given logos. */
async function askPresence(
  pdfBase64: string,
  defs: PictoDef[],
  instruction: string,
  agent: AgentIA,
  meta?: Omit<CallMeta, "agent">
): Promise<VisualRobotResult> {
  const liste = defs.map((p) => `- ${p.cle} : ${p.desc}`).join("\n");

  const response = await callMistral({
    model: VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "document_url", documentUrl: `data:application/pdf;base64,${pdfBase64}`, documentName: "bat.pdf" },
          { type: "text", text: `${instruction}\n${liste}\n\nRéponds STRICTEMENT en JSON, sans aucun autre texte :\n{"pictos":[{"cle":"...","presence":"PRESENT|ABSENT|INCERTAIN"}]}` },
        ],
      },
    ],
    maxTokens: 600,
    temperature: 0,
  }, { agent, ...meta });

  const raw = (response.choices?.[0]?.message?.content as string) ?? "";
  const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed = DetectionSchema.parse(JSON.parse(clean));

  const presences: Record<string, Presence> = {};
  for (const p of parsed.pictos) presences[p.cle] = p.presence;
  return { presences, tokensUsed: response.usage?.totalTokens ?? 0 };
}

/** First pass: detect all checklist logos on a single BAT face. */
export async function detectPictos(
  pdfBase64: string,
  meta?: Omit<CallMeta, "agent">
): Promise<VisualRobotResult> {
  return askPresence(
    pdfBase64,
    PICTOS_A_DETECTER,
    "Tu inspectes une étiquette alimentaire (le PDF joint). Pour CHAQUE logo ci-dessous, indique s'il est PRESENT, ABSENT ou INCERTAIN. N'invente rien : si tu hésites, réponds INCERTAIN.",
    "AUDIT_VISUEL",
    meta
  );
}

/**
 * Counter-exam: an independent adversarial second look at the contested logos.
 * Pushes the model to actively look for each (a first pass too easily says
 * ABSENT). The orchestrator reconciles this with the first pass — a split
 * opinion becomes INCERTAIN, killing the false alarm.
 */
export async function contreExaminerPictos(
  pdfBase64: string,
  cles: string[],
  meta?: Omit<CallMeta, "agent">
): Promise<VisualRobotResult> {
  const defs = PICTOS_A_DETECTER.filter((p) => cles.includes(p.cle));
  if (defs.length === 0) return { presences: {}, tokensUsed: 0 };
  return askPresence(
    pdfBase64,
    defs,
    "CONTRE-EXAMEN. Une première analyse a un doute sur ces logos. Regarde TRÈS attentivement l'étiquette (le PDF joint) et cherche ACTIVEMENT chacun, même petit ou dans un coin. Conclus honnêtement PRESENT, ABSENT ou INCERTAIN.",
    "AUDIT_CONTRE_EXAMEN",
    meta
  );
}
