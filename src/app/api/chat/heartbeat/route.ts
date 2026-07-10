import { NextRequest, NextResponse } from "next/server";
import { corsJson, corsPreflight } from "@/lib/cors";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const runtime = "edge";

export async function OPTIONS() {
  return corsPreflight();
}

// POST /api/chat/heartbeat
// Called every ~20-30s by the widget while the chat is open, and once more
// via navigator.sendBeacon on page unload. Keeps duration_seconds accurate
// without needing a long-lived connection.
// Body: { conversationId: string }
export async function POST(req: NextRequest) {
  try {
    const { conversationId } = await req.json();

    if (!conversationId) {
      return corsJson({ error: "conversationId is required" }, { status: 400 });
    }

    const now = new Date();

    await db
      .update(conversations)
      .set({
        lastSeenAt: now,
        endedAt: now,
        // duration = (now - startedAt) in seconds, computed in SQL to avoid clock drift
        durationSeconds: sql`EXTRACT(EPOCH FROM (${now.toISOString()}::timestamp - started_at))::int`,
      })
      .where(eq(conversations.id, conversationId));

    return corsJson({ ok: true });
  } catch (err) {
    console.error(err);
    return corsJson({ error: "Failed to update heartbeat" }, { status: 500 });
  }
}
