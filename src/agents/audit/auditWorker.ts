import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { fichesEtiquettes, controlesConformite, produits } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { RAGService } from "../knowledge/RAGService";
import crypto from "crypto";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AuditReport {
    ficheId: string;
    overallStatus: "PASS" | "WARNING" | "FAIL";
    controls: Array<{
        typeControle: any;
        statut: "PASS" | "WARNING" | "FAIL" | "SKIPPED";
        details?: any;
        suggestionIa?: string;
        justification?: string;
    }>;
}

export class AuditWorker {
    /**
     * Builds the prompt for the Audit Agent by injecting RAG context based on product details.
     */
    private static async buildAuditPrompt(fiche: any, product: any): Promise<string> {
        // Query RAG for regulations specific to this product's ingredients and claims
        const searchQuery = `Réglementation étiquetage, QUID, arrondi pour ${product.typeTheFr}. Allégations: ${fiche.allegationsSanteFr || "aucune"}. Allergènes: ${fiche.allergenes || "aucun"}.`;
        const ragContextRaw = await RAGService.searchContext(searchQuery, 3);
        const ragContext = RAGService.formatContextForPrompt(ragContextRaw);

        return `
SYSTEM:
Tu es l'Agent Qualité IA de GaïaLabel. Ton rôle est d'auditer la conformité d'une étiquette produit.
Tu dois vérifier strictement les règles INCO et les règles internes de l'entreprise PRO-QHS-013.

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

TACHE :
Génère un rapport JSON strict d'audit. Ton JSON doit avoir cette forme :
{
    "overallStatus": "PASS" | "WARNING" | "FAIL",
    "controls": [
        {
            "typeControle": "QUID" | "ROUNDING" | "ALLEGATION" | "ALLERGEN" | "REGLISSE",
            "statut": "PASS" | "WARNING" | "FAIL",
            "justification": "Explication de 1 phrase max.",
            "suggestionIa": "Correction proposée (si FAIL ou WARNING)"
        }
    ]
}
Tu dois exécuter tous ces 5 types de contrôles. 
`;
    }

    /**
     * Executes the LLM to get the audit report.
     */
    private static async runLlmAudit(prompt: string): Promise<AuditReport["controls"]> {
        if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "sk-ant-dummy-key") {
            console.log("[AuditWorker] Skipping LLM call, returning dummy data for local MVP.");
            return [
                { typeControle: "QUID", statut: "PASS", justification: "Les pourcentages sont bien indiqués." },
                { typeControle: "ROUNDING", statut: "FAIL", justification: "La somme des pourcentages fait 100.1%.", suggestionIa: "Réduire la menthe poivrée de 0.1%." },
                { typeControle: "ALLEGATION", statut: "WARNING", justification: "Allégation 'détox' détectée sans phrase obligatoire.", suggestionIa: "Ajouter la phrase: 'A consommer dans le cadre d'un mode de vie sain'." }
            ] as any[];
        }

        try {
            const response = await client.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1500,
                system: "Tu renvoies uniquement du JSON parfaitement formaté.",
                messages: [{ role: "user", content: prompt }]
            });
            const textOutput = (response.content[0] as any).text;
            const parsed = JSON.parse(textOutput);
            return parsed.controls;
        } catch (err) {
            console.error("LLM Audit failed:", err);
            return [{ typeControle: "SYSTEM", statut: "FAIL", justification: "Erreur IA." }] as any[];
        }
    }

    /**
     * Re-audits a batch of products perfectly meant for Mass Audits.
     * Use case: Regulation changed, re-run audit on 1000 labels.
     */
    public static async runMassAudit(ficheIds: string[], userId: string = "AI_AUDIT"): Promise<AuditReport[]> {
        console.log(`[AuditWorker] Starting Mass Audit for ${ficheIds.length} labels...`);
        const reports: AuditReport[] = [];

        // In a real world scenario with 10k items, this would use a message queue (BullMQ/Kafka)
        // For standard batches we iterate.
        for (const ficheId of ficheIds) {
            try {
                const report = await this.runSingleAudit(ficheId, userId);
                reports.push(report);
            } catch (err) {
                console.error(`Audit failed for fiche: ${ficheId}`, err);
                reports.push({
                    ficheId,
                    overallStatus: "FAIL",
                    controls: [{ typeControle: "SYSTEM", statut: "FAIL", justification: "Erreur système critique." }] as any[]
                });
            }
        }
        return reports;
    }

    /**
     * Core function to audit a single product label
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
        const controls = await this.runLlmAudit(prompt);

        const hasFail = controls.some(c => c.statut === "FAIL");
        const hasWarning = controls.some(c => c.statut === "WARNING");
        const overallStatus = hasFail ? "FAIL" : (hasWarning ? "WARNING" : "PASS");

        // Supprimer les anciens contrôles (Nettoyage de l'historique de cette version/fiche)
        await db.delete(controlesConformite).where(eq(controlesConformite.ficheEtiquetteId, ficheId));

        // Enregistrer les nouveaux contrôles
        for (const ctrl of controls) {
            await db.insert(controlesConformite).values({
                ficheEtiquetteId: ficheId,
                typeControle: ctrl.typeControle,
                statut: ctrl.statut,
                justification: ctrl.justification,
                suggestionIa: ctrl.suggestionIa,
                controlePar: userId
            });
        }

        // Mettre à jour le statut global de l'étiquette (Règle Métier)
        const finalEtiquetteStatus = overallStatus === "FAIL" ? "DESIGN_REVIEW" : "QUALITY_VALIDATED";
        await db.update(fichesEtiquettes)
            .set({ statut: finalEtiquetteStatus as any, misAJourLe: new Date() })
            .where(eq(fichesEtiquettes.id, ficheId));

        return {
            ficheId,
            overallStatus,
            controls
        };
    }
}
