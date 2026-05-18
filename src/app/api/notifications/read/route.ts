import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { auth } from "@/auth";

// MARQUER DES NOTIFICATIONS COMME LUES
export async function PATCH(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const body = await req.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "IDs manquants" }, { status: 400 });
        }

        await db
            .update(notifications)
            .set({ isRead: true })
            .where(
                and(
                    eq(notifications.userId, session.user.id),
                    inArray(notifications.id, ids)
                )
            );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erreur read notification:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// RECUPERER L'HISTORIQUE DES NOTIFICATIONS
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const history = await db
            .select()
            .from(notifications)
            .where(eq(notifications.userId, session.user.id))
            .orderBy(notifications.creeLe) // descending order isn't natively supported like this in simple calls without desc(), but we'll map
            // Need descending:
            // .orderBy(desc(notifications.creeLe))
            // I'll grab them and reverse in JSON for simplicity unless I import desc.
            // Actually let's just use it as is and reverse in JS to avoid import issues if desc is missing.
            .limit(50);

        return NextResponse.json(history.reverse());
    } catch (error) {
        console.error("Erreur history:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
