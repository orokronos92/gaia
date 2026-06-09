import { Mistral } from "@mistralai/mistralai";
import { z } from "zod";
import { db } from "@/db";
import { fichesEtiquettes, controlesConformite, produits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { RAGService } from "../knowledge/RAGService";
import { writeAuditLog } from "@/db/queries/audit-logs";

const AUDIT_MODEL = "mistral-large-latest";

// Validates the LLM output before it reaches the DB (CLAUDE.md §7). typeControle
// is restricted to the 5 checks the prompt asks for — all valid TypeControle enum
// values, so the rows insert safely.
const ControleSchema = z.object({
    typeControle: z.enum(["QUID", "ROUNDING", "ALLEGATION", "ALLERGEN", "REGLISSE"]),
    statut: z.enum(["PASS", "WARNING", "FAIL"]),
    justification: z.string().optional(),
    suggestionIa: z.string().optional(),
});
const AuditResponseSchema = z.object({
    overallStatus: z.enum(["PASS", "WARNING", "FAIL"]).optional(),
    controls: z.array(ControleSchema).min(1),
});

type Controle = z.infer<typeof ControleSchema>;

export interface AuditReport {
    ficheId: string;
    overallStatus: "PASS" | "WARNING" | "FAIL";
    controls: Array<{
        typeControle: string;
        statut: "PASS" | "WARNING" | "FAIL" | "SKIPPED";
        details?: unknown;
        suggestionIa?: string;
        justification?: string;
    }>;
}

export class AuditWorker {
    /**
     * Builds the audit prompt, injecting RAG context (real regulations) for this
     * product's ingredients and claims.
     */
    private static async buildAuditPrompt(fiche: any, product: any): Promise<string> {
        const searchQuery = `Réglementation étiquetage, QUID, arrondi pour ${product.typeTheFr}. Allégations: ${fiche.allegationsSanteFr || "aucune"}. Allergènes: ${fiche.allergenes || "aucun"}.`;
        const ragContextRaw = await RAGService.searchContext(searchQuery, 3);
        const ragContext = RAGService.formatContextForPrompt(ragContextRaw);

        return `Tu es l'Agent Qualité IA de GaïaLabel. Tu audites la conformité d'une étiquette produit.
Tu vérifies strictement les règles INCO et les règles internes PRO-QHS-013.

RÈGLES EN VIGUEUR (Extraites de la Base de Connaissances RAG) :
---
${ragContext}
---

CONTENU DE L'ÉTIQUETTE À VÉRIFIER :
- Code PF : ${product.codePf}
- Dénomination : ${product.denominationFr}
- Ingrédients : ${fiche.ingredientsFr}
- Allégations : ${fiche.allegationsSanteFr || "Aucune"}
- Allergènes : ${fiche.allergenes || "Aucun"}

TÂCHE :
Renvoie UNIQUEMENT un objet JSON strict, sans markdown :
{
    "overallStatus": "PASS" | "WARNING" | "FAIL",
    "controls": [
        {
            "typeControle": "QUID" | "ROUNDING" | "ALLEGATION" | "ALLERGEN" | "REGLISSE",
            "statut": "PASS" | "WARNING" | "FAIL",
            "justification": "Explication d'une phrase max.",
            "suggestionIa": "Correction proposée (si FAIL ou WARNING)"
        }
    ]
}
Exécute les 5 types de contrôles.`;
    }

    /**
     * Runs the audit LLM on Mistral (Mistral only — CLAUDE.md §7). Validates the
     * JSON with Zod. Throws on a missing key or a malformed response — the caller
     * degrades honestly instead of fabricating a result.
     */
    private static async runLlmAudit(
        prompt: string
    ): Promise<{ controls: Controle[]; usage: unknown }> {
        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey) {
            throw new Error("MISTRAL_API_KEY manquante — audit IA indisponible.");
        }

        const client = new Mistral({ apiKey });
        const response = await client.chat.complete({
            model: AUDIT_MODEL,
            messages: [
                {
                    role: "system",
                    content:
                        "Tu es un moteur d'audit réglementaire. Tu renvoies UNIQUEMENT un objet JSON valide, sans markdown ni commentaire.",
                },
                { role: "user", content: prompt },
            ],
            responseFormat: { type: "json_object" },
            maxTokens: 1500,
            temperature: 0.1,
        });

        const raw = response.choices?.[0]?.message?.content;
        const parsed = AuditResponseSchema.parse(
            JSON.parse(typeof raw === "string" ? raw : "{}")
        );
        return { controls: parsed.controls, usage: response.usage };
    }

    /**
     * Re-audits an arbitrary snapshot (a saved version) WITHOUT persisting —
     * "does this old state still pass today's rules?" (versioning / legislation).
     * Reuses the RAG-built prompt and the Mistral call.
     */
    public static async auditerSnapshot(
        fiche: Record<string, unknown>,
        produit: Record<string, unknown>
    ): Promise<Controle[]> {
        const prompt = await this.buildAuditPrompt(fiche, produit);
        const { controls } = await this.runLlmAudit(prompt);
        return controls;
    }

    /**
     * Re-audits a batch of labels (e.g. a regulation changed). Each fiche failure
     * is isolated so one bad label doesn't sink the batch.
     */
    public static async runMassAudit(ficheIds: string[], userId: string = "AI_AUDIT"): Promise<AuditReport[]> {
        const reports: AuditReport[] = [];
        for (const ficheId of ficheIds) {
            try {
                reports.push(await this.runSingleAudit(ficheId, userId));
            } catch (err) {
                console.error(`Audit failed for fiche: ${ficheId}`, err);
                reports.push({
                    ficheId,
                    overallStatus: "FAIL",
                    controls: [{ typeControle: "SYSTEM", statut: "SKIPPED", justification: "Erreur système critique." }],
                });
            }
        }
        return reports;
    }

    /**
     * Audits a single label. On a successful LLM run, persists the controls and
     * updates the label status. On an IA failure, leaves the previous audit
     * untouched and returns an honest SKIPPED report (no fabricated result).
     */
    public static async runSingleAudit(ficheId: string, userId: string = "AI_AUDIT"): Promise<AuditReport> {
        const [ficheDetails] = await db
            .select({ fiche: fichesEtiquettes, produit: produits })
            .from(fichesEtiquettes)
            .innerJoin(produits, eq(fichesEtiquettes.produitId, produits.id))
            .where(eq(fichesEtiquettes.id, ficheId))
            .limit(1);

        if (!ficheDetails) {
            throw new Error(`Fiche ID ${ficheId} introuvable.`);
        }

        const prompt = await this.buildAuditPrompt(ficheDetails.fiche, ficheDetails.produit);

        let controls: Controle[];
        let usage: unknown;
        try {
            ({ controls, usage } = await this.runLlmAudit(prompt));
        } catch (err) {
            const message = err instanceof Error ? err.message : "Audit IA indisponible.";
            return {
                ficheId,
                overallStatus: "WARNING",
                controls: [{ typeControle: "SYSTEM", statut: "SKIPPED", justification: message }],
            };
        }

        const hasFail = controls.some((c) => c.statut === "FAIL");
        const hasWarning = controls.some((c) => c.statut === "WARNING");
        const overallStatus = hasFail ? "FAIL" : hasWarning ? "WARNING" : "PASS";

        // Replace this fiche's previous controls with the fresh ones.
        await db.delete(controlesConformite).where(eq(controlesConformite.ficheEtiquetteId, ficheId));
        for (const ctrl of controls) {
            await db.insert(controlesConformite).values({
                ficheEtiquetteId: ficheId,
                typeControle: ctrl.typeControle,
                statut: ctrl.statut,
                justification: ctrl.justification,
                suggestionIa: ctrl.suggestionIa,
                controlePar: userId,
            });
        }

        const finalEtiquetteStatus = overallStatus === "FAIL" ? "DESIGN_REVIEW" : "QUALITY_VALIDATED";
        await db
            .update(fichesEtiquettes)
            .set({ statut: finalEtiquetteStatus as any, misAJourLe: new Date() })
            .where(eq(fichesEtiquettes.id, ficheId));

        // Token-usage trail (CLAUDE.md §7); best-effort, never blocks the audit.
        await writeAuditLog({
            typeEntite: "audit",
            entiteId: ficheId,
            action: "AUDIT_IA_TOKENS",
            utilisateurId: userId,
            changements: { model: AUDIT_MODEL, usage },
        });

        return { ficheId, overallStatus, controls };
    }
}
