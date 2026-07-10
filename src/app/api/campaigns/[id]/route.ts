import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireClientId, requireAdmin } from "@/lib/session";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  allowedDomains: z.array(z.string()).optional(),
  botConfig: z.record(z.any()).optional(),
});

// GET /api/campaigns/:id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const clientId = await requireClientId();

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, params.id), eq(campaigns.clientId, clientId)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}

// PATCH /api/campaigns/:id — update name/status/config
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const clientId = await requireClientId();
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const [updated] = await db
      .update(campaigns)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(campaigns.id, params.id), eq(campaigns.clientId, clientId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign: updated });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(err);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

// DELETE /api/campaigns/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const clientId = await requireAdmin();

    const [deleted] = await db
      .delete(campaigns)
      .where(and(eq(campaigns.id, params.id), eq(campaigns.clientId, clientId)))
      .returning({ id: campaigns.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    console.error(err);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
