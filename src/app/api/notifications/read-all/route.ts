import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

export async function PATCH(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        await db
            .update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.userId, session.user.id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erreur read-all notifications:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
