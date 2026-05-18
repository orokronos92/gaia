import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";

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
            .orderBy(desc(notifications.creeLe))
            .limit(50);

        return NextResponse.json(history);
    } catch (error) {
        console.error("Erreur fetching notification history:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
