import { NextRequest, NextResponse } from "next/server";
import { corsJson, corsPreflight } from "@/lib/cors";
import { db } from "@/db";
import { campaigns, conversations, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { detectTrafficSource } from "@/lib/attribution";

export const runtime = "edge"; // low cold-start, and Vercel geo headers are populated here

export async function OPTIONS() {
  return corsPreflight();
}

// POST /api/chat/start
// Body: { embedKey: string, pageUrl: string, referrerUrl?: string }
export async function POST(req: NextRequest) {
  try {
    const { embedKey, pageUrl, referrerUrl } = await req.json();

    if (!embedKey) {
      return corsJson({ error: "embedKey is required" }, { status: 400 });
    }

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.embedKey, embedKey))
      .limit(1);

    if (!campaign || campaign.status !== "active") {
      return corsJson({ error: "Invalid or inactive campaign" }, { status: 404 });
    }

    // Domain whitelist check (skip if client left it empty = allow any domain)
    if (campaign.allowedDomains.length > 0 && pageUrl) {
      const hostname = new URL(pageUrl).hostname;
      const allowed = campaign.allowedDomains.some((d) => hostname.endsWith(d));
      if (!allowed) {
        return corsJson({ error: "Domain not authorized for this embed key" }, { status: 403 });
      }
    }

    // Vercel populates these headers automatically at the edge — free geolocation, no API call
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const city = req.headers.get("x-vercel-ip-city") || null;
    const region = req.headers.get("x-vercel-ip-country-region") || null;
    const country = req.headers.get("x-vercel-ip-country") || null;
    const userAgent = req.headers.get("user-agent") || null;

    const visitorId = nanoid(24); // stored client-side (localStorage) to re-identify returning visitors
    const attribution = detectTrafficSource(pageUrl, referrerUrl);

    const [conversation] = await db
      .insert(conversations)
      .values({
        campaignId: campaign.id,
        visitorId,
        ipAddress: ip,
        city: city ? decodeURIComponent(city) : null,
        region,
        country,
        userAgent,
        referrerUrl: referrerUrl || null,
        pageUrl: pageUrl || null,
        utmSource: attribution.utmSource,
        utmMedium: attribution.utmMedium,
        utmCampaign: attribution.utmCampaign,
        trafficSource: attribution.trafficSource,
      })
      .returning();

    // Insert the bot's opening message — either the first flow step's message,
    // or the plain greeting for campaigns without a configured flow
    const flow = (campaign.botConfig as any)?.flow;
    const greeting = flow?.[0]?.message || (campaign.botConfig as any)?.greeting || "Hi! How can I help you today?";
    await db.insert(messages).values({
      conversationId: conversation.id,
      sender: "bot",
      content: greeting,
    });

    // Fire-and-forget ISP/network lookup — never block the chat response on this
    if (process.env.IPINFO_TOKEN && ip !== "unknown") {
      fetch(`https://ipinfo.io/${ip}?token=${process.env.IPINFO_TOKEN}`)
        .then((r) => r.json())
        .then((info) =>
          db
            .update(conversations)
            .set({ network: info.org || null })
            .where(eq(conversations.id, conversation.id))
        )
        .catch(() => {}); // best-effort only
    }

    return corsJson({
      conversationId: conversation.id,
      visitorId,
      greeting,
      botConfig: campaign.botConfig,
    });
  } catch (err) {
    console.error(err);
    return corsJson({ error: "Failed to start conversation" }, { status: 500 });
  }
}
