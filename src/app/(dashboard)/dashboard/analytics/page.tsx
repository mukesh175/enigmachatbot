import { db } from "@/db";
import { conversations, leads, campaigns } from "@/db/schema";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { requireClientId } from "@/lib/session";
import AnalyticsCharts from "./analytics-charts";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const clientId = await requireClientId();

  const myCampaigns = await db
    .select({ id: campaigns.id, name: campaigns.name })
    .from(campaigns)
    .where(eq(campaigns.clientId, clientId));

  const campaignIds = myCampaigns.map((c) => c.id);
  const campaignNameMap = Object.fromEntries(myCampaigns.map((c) => [c.id, c.name]));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  if (campaignIds.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Analytics</h1>
        <p className="text-sm text-gray-500">Create a campaign to start seeing data here.</p>
      </div>
    );
  }

  // Live per-day, per-campaign rollup — computed on request directly from the
  // source tables (no cron/pre-aggregation needed). Indexed on campaignId +
  // startedAt/createdAt, so this stays fast even with a lot of chat volume.
  const rows = await db
    .select({
      date: sql<string>`date_trunc('day', ${conversations.startedAt})::date`,
      campaignId: conversations.campaignId,
      totalChats: sql<number>`count(distinct ${conversations.id})::int`,
      avgDuration: sql<number>`coalesce(avg(${conversations.durationSeconds}), 0)::real`,
    })
    .from(conversations)
    .where(and(inArray(conversations.campaignId, campaignIds), gte(conversations.startedAt, thirtyDaysAgo)))
    .groupBy(sql`date_trunc('day', ${conversations.startedAt})::date`, conversations.campaignId)
    .orderBy(sql`date_trunc('day', ${conversations.startedAt})::date DESC`);

  const leadRows = await db
    .select({
      date: sql<string>`date_trunc('day', ${leads.createdAt})::date`,
      campaignId: leads.campaignId,
      totalLeads: sql<number>`count(*)::int`,
    })
    .from(leads)
    .where(and(inArray(leads.campaignId, campaignIds), gte(leads.createdAt, thirtyDaysAgo)))
    .groupBy(sql`date_trunc('day', ${leads.createdAt})::date`, leads.campaignId);

  const leadMap = new Map(leadRows.map((l) => [`${l.date}_${l.campaignId}`, l.totalLeads]));

  const combined = rows.map((r) => {
    const totalLeads = leadMap.get(`${r.date}_${r.campaignId}`) || 0;
    return {
      ...r,
      totalLeads,
      conversionRate: r.totalChats > 0 ? totalLeads / r.totalChats : 0,
    };
  });

  const totals = combined.reduce(
    (acc, r) => {
      acc.chats += r.totalChats;
      acc.leads += r.totalLeads;
      return acc;
    },
    { chats: 0, leads: 0 }
  );
  const overallConversion = totals.chats > 0 ? ((totals.leads / totals.chats) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Live data — updates immediately, no waiting on a scheduled job.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Chats (30d)" value={totals.chats} />
        <StatCard label="Total Leads (30d)" value={totals.leads} />
        <StatCard label="Conversion Rate" value={`${overallConversion}%`} />
      </div>

      {combined.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-10 text-center">
          <p className="text-sm text-gray-500">No chat activity in the last 30 days yet.</p>
        </div>
      ) : (
        <>
          <AnalyticsCharts rows={combined} />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Campaign</th>
                <th className="p-3 font-medium">Chats</th>
                <th className="p-3 font-medium">Leads</th>
                <th className="p-3 font-medium">Avg. Duration</th>
                <th className="p-3 font-medium">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {combined.map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="p-3">{r.date}</td>
                  <td className="p-3">{campaignNameMap[r.campaignId]}</td>
                  <td className="p-3">{r.totalChats}</td>
                  <td className="p-3">{r.totalLeads}</td>
                  <td className="p-3">{Math.round(r.avgDuration)}s</td>
                  <td className="p-3">{(r.conversionRate * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
      <div className="text-xs font-medium text-gray-500 mb-2">{label}</div>
      <div className="text-3xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}
