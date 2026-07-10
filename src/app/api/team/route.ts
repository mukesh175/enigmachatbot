import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import bcrypt from "bcryptjs";
import { z } from "zod";

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "member"]).default("member"),
});

// GET /api/team — list all team members for the org (admin only)
export async function GET() {
  try {
    const clientId = await requireAdmin();
    const rows = await db.select().from(teamMembers).where(eq(teamMembers.clientId, clientId));
    return NextResponse.json({
      members: rows.map((m) => ({ id: m.id, name: m.name, email: m.email, role: m.role, createdAt: m.createdAt })),
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

// POST /api/team — invite a new team member (admin only)
export async function POST(req: NextRequest) {
  try {
    const clientId = await requireAdmin();
    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, email, password, role } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);

    const [member] = await db
      .insert(teamMembers)
      .values({ clientId, name, email, passwordHash, role })
      .returning({ id: teamMembers.id, name: teamMembers.name, email: teamMembers.email, role: teamMembers.role });

    return NextResponse.json({ member }, { status: 201 });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    if (err?.code === "23505") return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: "Failed to invite team member" }, { status: 500 });
  }
}
