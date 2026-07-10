import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns, conversations, leads, analyticsDaily } from "@/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";

// This route is called by Vercel Cron (see vercel.json) once per hour.
// It aggregates yesterday+today's raw conversation/lead data into
// analytics_daily, so the dashboard NEVER runs expensive aggregate
// queries against the raw tables at request time.
export async function GET(req: NextRequest) {
  // Protect the cron endpoint — Vercel Cron sends this header automatically
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allCampaigns = await db.select({ id: campaigns.id }).from(campaigns);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const dateStr = today.toISOString().slice(0, 10);

    for (const campaign of allCampaigns) {
      const [convStats] = await db
        .select({
          totalChats: sql<number>`count(*)::int`,
          avgDuration: sql<number>`coalesce(avg(${conversations.durationSeconds}), 0)::real`,
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.campaignId, campaign.id),
            gte(conversations.startedAt, today),
            lt(conversations.startedAt, tomorrow)
          )
        );

      const [leadStats] = await db
        .select({ totalLeads: sql<number>`count(*)::int` })
        .from(leads)
        .where(
          and(
            eq(leads.campaignId, campaign.id),
            gte(leads.createdAt, today),
            lt(leads.createdAt, tomorrow)
          )
        );

      const totalChats = convStats?.totalChats || 0;
      const totalLeads = leadStats?.totalLeads || 0;
      const conversionRate = totalChats > 0 ? totalLeads / totalChats : 0;

      // Upsert: insert today's row, or update it if the cron already ran today
      await db
        .insert(analyticsDaily)
        .values({
          campaignId: campaign.id,
          date: dateStr,
          totalChats,
          totalLeads,
          avgDurationSeconds: convStats?.avgDuration || 0,
          conversionRate,
        })
        .onConflictDoUpdate({
          target: [analyticsDaily.campaignId, analyticsDaily.date],
          set: {
            totalChats,
            totalLeads,
            avgDurationSeconds: convStats?.avgDuration || 0,
            conversionRate,
          },
        });
    }

    return NextResponse.json({ ok: true, campaignsProcessed: allCampaigns.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Rollup failed" }, { status: 500 });
  }
}
