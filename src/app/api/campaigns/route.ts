import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireClientId } from "@/lib/session";

const createCampaignSchema = z.object({
  name: z.string().min(2),
  allowedDomains: z.array(z.string()).default([]),
  botConfig: z
    .object({
      greeting: z.string().default("Hi! How can I help you today?"),
      theme: z.string().default("#111111"),
      questions: z.array(z.string()).default([]),
    })
    .partial()
    .default({}),
});

// GET /api/campaigns — list all campaigns for the logged-in client
export async function GET() {
  try {
    const clientId = await requireClientId();

    const rows = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.clientId, clientId))
      .orderBy(desc(campaigns.createdAt));

    return NextResponse.json({ campaigns: rows });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

// POST /api/campaigns — create a new campaign, returns embed key
export async function POST(req: NextRequest) {
  try {
    const clientId = await requireClientId();
    const body = await req.json();
    const parsed = createCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, allowedDomains, botConfig } = parsed.data;
    const embedKey = nanoid(20); // unique public key used in the <script> embed tag

    const [campaign] = await db
      .insert(campaigns)
      .values({
        clientId,
        name,
        embedKey,
        allowedDomains,
        botConfig,
      })
      .returning();

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
