import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireClientId } from "@/lib/session";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["new", "contacted", "converted", "rejected"]),
});

// PATCH /api/leads/:id — used by the status dropdown in the Leads table
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const clientId = await requireClientId();
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const [updated] = await db
      .update(leads)
      .set({ status: parsed.data.status })
      .where(and(eq(leads.id, params.id), eq(leads.clientId, clientId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ lead: updated });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
