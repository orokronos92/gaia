import { NextResponse } from "next/server";
import { AuditWorker } from "@/agents/audit/auditWorker";
import { db } from "@/db";
import { fichesEtiquettes } from "@/db/schema";
import { inArray } from "drizzle-orm";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { ficheIds, massAudit } = body;

        if (!ficheIds || !Array.isArray(ficheIds) || ficheIds.length === 0) {
            return NextResponse.json({ error: "Fournir un tableau valide d'IDs (ficheIds)." }, { status: 400 });
        }

        // Pour un audit de masse qui peut être très long, il serait préférable d'avoir un job asynchrone (ex: BullMQ)
        // Mais pour la démonstration MVC, on exécute en synchrone ou en tâche non bloquante.
        // Si plus de 5 IDs, on lance en background et on répond tout de suite (Fake queue)

        if (massAudit && ficheIds.length > 5) {
            // "Fire and forget" the audit process to not block the Vercel/Node request timeout (edge computing concept)
            AuditWorker.runMassAudit(ficheIds).catch(console.error);
            return NextResponse.json({
                success: true,
                message: `Audit de masse lancé sur ${ficheIds.length} étiquettes. Cela prendra quelques minutes.`,
                background: true
            });
        } else {
            // Audit synchrone
            const reports = await AuditWorker.runMassAudit(ficheIds);
            return NextResponse.json({
                success: true,
                data: reports
            });
        }
    } catch (error: any) {
        console.error("Erreur API Audit:", error);
        return NextResponse.json(
            { error: "Échec de lancement de l'audit.", details: error.message },
            { status: 500 }
        );
    }
}
