import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireClientId } from "@/lib/session";
import { notFound } from "next/navigation";
import CampaignEditor from "./editor";
import CopySnippet from "./copy-snippet";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const clientId = await requireClientId();

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, params.id), eq(campaigns.clientId, clientId)))
    .limit(1);

  if (!campaign) {
    notFound();
  }

  const embedSnippet = `<script src="http://localhost:3000/widget.js" data-embed-key="${campaign.embedKey}" async></script>`;
  // NOTE: swap http://localhost:3000 for your real deployed domain once you go live on Vercel.

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">{campaign.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Status: <span className="font-medium text-gray-700">{campaign.status}</span>
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Embed snippet</h3>
        <p className="text-xs text-gray-500 mb-3">Paste this on any landing page — works on any platform.</p>
        <CopySnippet snippet={embedSnippet} />
      </div>

      <CampaignEditor campaign={campaign} />
    </div>
  );
}
