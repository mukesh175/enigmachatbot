import { db } from "@/db";
import { campaigns, leads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireClientId } from "@/lib/session";
import Link from "next/link";
import { Megaphone, Users, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const clientId = await requireClientId();

  const myCampaigns = await db.select().from(campaigns).where(eq(campaigns.clientId, clientId));
  const myLeads = await db.select({ id: leads.id }).from(leads).where(eq(leads.clientId, clientId));
  const activeCount = myCampaigns.filter((c) => c.status === "active").length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">A quick snapshot of your lead-gen performance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Active Campaigns"
          value={activeCount}
          icon={<Megaphone size={20} className="text-brand-500" />}
        />
        <StatCard
          label="Total Leads Captured"
          value={myLeads.length}
          icon={<Users size={20} className="text-brand-500" />}
        />
        <StatCard
          label="All Campaigns"
          value={myCampaigns.length}
          icon={<Megaphone size={20} className="text-brand-500" />}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Your Campaigns</h2>
          <Link
            href="/dashboard/campaigns"
            className="text-sm text-brand-600 font-medium flex items-center gap-1 hover:text-brand-700"
          >
            View all <ArrowUpRight size={14} />
          </Link>
        </div>

        {myCampaigns.length === 0 ? (
          <p className="text-sm text-gray-500">No campaigns yet — create your first one to get started.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {myCampaigns.slice(0, 5).map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Status: {c.status}</div>
                </div>
                <Link
                  href={`/dashboard/campaigns/${c.id}`}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Manage
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">{icon}</div>
      </div>
      <div className="text-3xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}
