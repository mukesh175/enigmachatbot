import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireClientId } from "@/lib/session";
import Link from "next/link";
import { Plus, Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
  archived: "bg-gray-100 text-gray-500",
};

export default async function CampaignsPage() {
  const clientId = await requireClientId();

  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.clientId, clientId))
    .orderBy(desc(campaigns.createdAt));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage your lead-gen chat campaigns.</p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="flex items-center gap-2 bg-brand-gradient text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-card hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> New Campaign
        </Link>
      </div>

      {rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-10 text-center">
          <Megaphone className="mx-auto text-gray-300 mb-3" size={32} />
          <p className="text-sm text-gray-500">No campaigns yet. Create your first one to get started.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/campaigns/${c.id}`}
            className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 hover:border-brand-200 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <Megaphone size={18} className="text-brand-500" />
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[c.status] || statusStyles.archived}`}>
                {c.status}
              </span>
            </div>
            <div className="font-medium text-gray-900">{c.name}</div>
            <div className="text-xs text-gray-400 mt-1 truncate">Key: {c.embedKey}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
