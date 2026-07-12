import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireClientId } from "@/lib/session";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
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

  // Auto-detects the real domain (localhost while developing, your actual
  // Vercel domain once deployed) — no more hardcoded/stale URLs in the snippet.
  const headersList = headers();
  const host = headersList.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const position = (campaign.botConfig as any)?.position || "bottom-right";
  const embedSnippet = `<script src="${baseUrl}/widget.js" data-embed-key="${campaign.embedKey}" data-position="${position}" async></script>`;

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
