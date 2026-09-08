/**
 * Semantic robot — LLM judgement of meaning equivalence (Mistral large).
 *
 * For elements worded freely on the label (the health claim, the legal
 * denomination), an exact match is wrong — the BAT says "STIMULANT & TONIQUE"
 * where the fiche declares "Tonifiant / vitalité". This robot judges whether the
 * fiche element is correctly reflected on the BAT *even if reworded*. It only
 * handles what the deterministic text robot cannot; its output is Zod-validated.
 */

import { z } from "zod";

import type { ControlStatus } from "@/lib/audit/types";
import type { BatTextCheck, BatTextInput } from "@/lib/audit/visual/text-robot";
import { callMistral, type CallMeta } from "../mistral-call";
import { TEXT_MODEL } from "../models";

const STATUTS = ["CONFORME", "DOUTE", "ABSENT"] as const;
const SemanticSchema = z.object({
  resultats: z.array(
    z.object({ cle: z.string(), statut: z.enum(STATUTS), justification: z.string() })
  ),
});

const STATUT_MAP: Record<(typeof STATUTS)[number], ControlStatus> = {
  CONFORME: "PASS",
  DOUTE: "WARNING",
  ABSENT: "WARNING",
};

interface ElementSemantique {
  cle: string;
  libelle: string;
  rubrique: string;
  attendu: string;
}

function declares(value?: string | null): boolean {
  if (!value) return false;
  const n = value.trim().toLowerCase();
  return n !== "" && n !== "non" && n !== "aucun" && n !== "aucune";
}

/** Fiche elements that must be judged by meaning, not by exact match. */
function buildElements(input: BatTextInput): ElementSemantique[] {
  const elements: ElementSemantique[] = [];
  if (declares(input.allegation)) {
    elements.push({
      cle: "SEM_ALLEGATION",
      libelle: "Allégation correctement reflétée sur le BAT (mentions associées comprises) ?",
      rubrique: "Particularités",
      attendu: input.allegation!,
    });
  }
  return elements;
}

export interface SemanticResult {
  checks: BatTextCheck[];
  tokensUsed: number;
}

/** Judges, per free-text fiche element, whether the BAT reflects it (by meaning). */
export async function auditSemantique(
  batText: string,
  input: BatTextInput,
  meta?: Omit<CallMeta, "agent">
): Promise<SemanticResult> {
  const elements = buildElements(input);
  if (elements.length === 0) return { checks: [], tokensUsed: 0 };

  const liste = elements.map((e) => `- ${e.cle} (déclaré en fiche) : "${e.attendu}"`).join("\n");
  const prompt = `Voici le TEXTE d'une étiquette alimentaire (BAT) :
"""
${batText.slice(0, 6000)}
"""

Pour CHAQUE élément déclaré dans la fiche ci-dessous, juge s'il est correctement reflété sur le BAT — MÊME si la formulation diffère (équivalence de sens). Si un détail diverge (ex. nombre de tasses), réponds DOUTE. Réponds CONFORME, DOUTE ou ABSENT, avec une justification d'UNE phrase.
${liste}

Réponds STRICTEMENT en JSON : {"resultats":[{"cle":"...","statut":"CONFORME|DOUTE|ABSENT","justification":"..."}]}`;

  const response = await callMistral({
    model: TEXT_MODEL,
    messages: [{ role: "user", content: prompt }],
    responseFormat: { type: "json_object" },
    maxTokens: 700,
    temperature: 0,
  }, { agent: "AUDIT_SEMANTIQUE", ...meta });

  const raw = (response.choices?.[0]?.message?.content as string) ?? "";
  const parsed = SemanticSchema.parse(JSON.parse(raw.replace(/```json/gi, "").replace(/```/g, "").trim()));

  const byCle = new Map(elements.map((e) => [e.cle, e]));
  const checks: BatTextCheck[] = parsed.resultats
    .filter((r) => byCle.has(r.cle))
    .map((r) => {
      const e = byCle.get(r.cle)!;
      return {
        id: e.cle,
        // L'allégation est le point 5.2 de PRO-QHS-013 (§3.2).
        checklistId: "5.2",
        origine: "semantique",
        rubrique: e.rubrique,
        libelle: e.libelle,
        statut: STATUT_MAP[r.statut],
        justification: r.justification,
      };
    });

  return { checks, tokensUsed: response.usage?.totalTokens ?? 0 };
}
