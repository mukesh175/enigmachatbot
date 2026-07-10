import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";

// DELETE /api/team/:id — remove a team member (admin only)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const clientId = await requireAdmin();

    const [deleted] = await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.id, params.id), eq(teamMembers.clientId, clientId)))
      .returning({ id: teamMembers.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    console.error(err);
    return NextResponse.json({ error: "Failed to remove team member" }, { status: 500 });
  }
}
