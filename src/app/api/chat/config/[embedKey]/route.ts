import { NextRequest } from "next/server";
import { corsJson, corsPreflight } from "@/lib/cors";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function OPTIONS() {
  return corsPreflight();
}

// GET /api/chat/config/:embedKey
// Returns just the branding/config (theme, teaser text, icons) so the widget
// can show its teaser bubble and correct styling BEFORE the visitor clicks —
// without creating a conversation row for every single page view.
export async function GET(_req: NextRequest, { params }: { params: { embedKey: string } }) {
  try {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.embedKey, params.embedKey))
      .limit(1);

    if (!campaign || campaign.status !== "active") {
      return corsJson({ error: "Invalid or inactive campaign" }, { status: 404 });
    }

    const config = campaign.botConfig as any;
    return corsJson({
      theme: config?.theme,
      headerText: config?.headerText,
      bubbleIcon: config?.bubbleIcon,
      logo: config?.logo,
      teaserText: config?.teaserText,
    });
  } catch (err) {
    console.error(err);
    return corsJson({ error: "Failed to fetch config" }, { status: 500 });
  }
}
