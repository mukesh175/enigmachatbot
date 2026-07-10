import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { z } from "zod";

const updateSchema = z.object({
  avatarUrl: z.string().optional(),
  notifyEmailOnLead: z.boolean().optional(),
});

export async function GET() {
  try {
    const { clientId } = await requireSession();
    const [client] = await db
      .select({
        name: clients.name,
        email: clients.email,
        avatarUrl: clients.avatarUrl,
        notifyEmailOnLead: clients.notifyEmailOnLead,
      })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    return NextResponse.json({ settings: client });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// Note: this updates the org-level (owner) settings. Only meaningful when
// called by the admin account itself, since avatar/notification prefs live
// on the `clients` row, not per-team-member.
export async function PATCH(req: NextRequest) {
  try {
    const { clientId } = await requireSession();
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await db.update(clients).set(parsed.data).where(eq(clients.id, clientId));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
