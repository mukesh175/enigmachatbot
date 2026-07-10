"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ListChecks } from "lucide-react";

export default function NewCampaignPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"ai" | "custom" | null>(null);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("Qualify the visitor and collect their email or WhatsApp number.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const botConfig =
      mode === "ai"
        ? { mode: "ai", goal, tone: "friendly, concise, helpful" }
        : { mode: "custom", flow: [] };

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, botConfig }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error?.formErrors?.join(", ") || "Failed to create campaign");
      return;
    }

    router.push(`/dashboard/campaigns/${data.campaign.id}`);
  }

  if (!mode) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">New Campaign</h1>
        <p className="text-sm text-gray-500 mb-6">How should this bot talk to visitors?</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setMode("ai")}
            className="text-left bg-white rounded-2xl border border-gray-100 shadow-card p-6 hover:border-brand-300 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
              <Sparkles size={18} className="text-brand-500" />
            </div>
            <div className="font-medium text-gray-900 mb-1">AI-based chat</div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Free-form conversation powered by AI. You give it a goal and tone, and it naturally chats
              with visitors and asks for their contact info when the moment feels right. Best for open-ended
              questions or complex products.
            </p>
          </button>

          <button
            onClick={() => setMode("custom")}
            className="text-left bg-white rounded-2xl border border-gray-100 shadow-card p-6 hover:border-brand-300 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
              <ListChecks size={18} className="text-brand-500" />
            </div>
            <div className="font-medium text-gray-900 mb-1">Custom guided flow</div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Build an exact step-by-step conversation with tap-to-answer buttons, images, and a fixed
              order. No AI involved — fast, predictable, and great for ad campaigns (Google/Meta) where
              you want a consistent script every time.
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <button onClick={() => setMode(null)} className="text-xs text-gray-400 hover:text-gray-600 mb-4">
        ← Back
      </button>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">
        {mode === "ai" ? "New AI-based Campaign" : "New Custom Campaign"}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {mode === "ai"
          ? "Set a name and goal — you can fine-tune tone later."
          : "Set a name — you'll build the step-by-step flow on the next screen."}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm text-gray-700">
          Campaign name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="block w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </label>

        {mode === "ai" && (
          <label className="text-sm text-gray-700">
            Bot goal
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              className="block w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-brand-gradient text-white py-2.5 rounded-xl text-sm font-medium mt-2 hover:opacity-90 transition-opacity"
        >
          {loading ? "Creating..." : "Create Campaign"}
        </button>
      </form>
    </div>
  );
}

