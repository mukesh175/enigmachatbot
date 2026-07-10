import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads, campaigns, conversations } from "@/db/schema";
import { eq, and, desc, or, ilike, inArray } from "drizzle-orm";
import { requireClientId, requireAdmin } from "@/lib/session";

// GET /api/leads?search=...&status=...&source=...
// Powers the Leads dashboard table — search/filter happens server-side so
// the client only ever receives the rows it actually needs to render.
export async function GET(req: NextRequest) {
  try {
    const clientId = await requireClientId();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const source = searchParams.get("source");

    const conditions = [eq(leads.clientId, clientId)];

    if (status && status !== "all") {
      conditions.push(eq(leads.status, status));
    }
    if (source && source !== "all") {
      conditions.push(eq(conversations.trafficSource, source));
    }
    if (search) {
      conditions.push(
        or(ilike(leads.email, `%${search}%`), ilike(leads.phone, `%${search}%`), ilike(leads.name, `%${search}%`))!
      );
    }

    const rows = await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        status: leads.status,
        createdAt: leads.createdAt,
        campaignName: campaigns.name,
        city: conversations.city,
        country: conversations.country,
        ipAddress: conversations.ipAddress,
        durationSeconds: conversations.durationSeconds,
        trafficSource: conversations.trafficSource,
        utmCampaign: conversations.utmCampaign,
      })
      .from(leads)
      .innerJoin(campaigns, eq(leads.campaignId, campaigns.id))
      .innerJoin(conversations, eq(leads.conversationId, conversations.id))
      .where(and(...conditions))
      .orderBy(desc(leads.createdAt))
      .limit(1000);

    return NextResponse.json({ leads: rows });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

// DELETE /api/leads — bulk delete. Body: { ids: string[] }. Admin only.
export async function DELETE(req: NextRequest) {
  try {
    const clientId = await requireAdmin();
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    const deleted = await db
      .delete(leads)
      .where(and(eq(leads.clientId, clientId), inArray(leads.id, ids)))
      .returning({ id: leads.id });

    return NextResponse.json({ deletedCount: deleted.length });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    console.error(err);
    return NextResponse.json({ error: "Failed to delete leads" }, { status: 500 });
  }
}
