import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    let lastCheckedTime = new Date();

    const stream = new ReadableStream({
        async start(controller) {
            // Keep the connection alive with comments
            const keepAliveInterval = setInterval(() => {
                controller.enqueue(new TextEncoder().encode(": keep-alive\n\n"));
            }, 10000);

            // Poll the database every 5 seconds for new notifications
            const pollingInterval = setInterval(async () => {
                try {
                    const newNotifs = await db
                        .select()
                        .from(notifications)
                        .where(
                            and(
                                eq(notifications.userId, userId),
                                gt(notifications.creeLe, lastCheckedTime) // Only fetch newly created ones
                            )
                        )
                        .orderBy(notifications.creeLe);

                    if (newNotifs.length > 0) {
                        lastCheckedTime = new Date(); // Update the cursor
                        for (const notif of newNotifs) {
                            controller.enqueue(
                                new TextEncoder().encode(`data: ${JSON.stringify(notif)}\n\n`)
                            );
                        }
                    }
                } catch (error) {
                    console.error("SSE Polling Error", error);
                }
            }, 5000);

            req.signal.addEventListener("abort", () => {
                clearInterval(keepAliveInterval);
                clearInterval(pollingInterval);
                controller.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no" // For Nginx compatibility
        }
    });
}
