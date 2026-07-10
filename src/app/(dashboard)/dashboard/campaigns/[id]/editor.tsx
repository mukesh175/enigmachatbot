"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FlowBuilder from "./flow-builder";
import { Trash2, Image as ImageIcon, X } from "lucide-react";

export default function CampaignEditor({ campaign }: { campaign: any }) {
  const router = useRouter();
  const [status, setStatus] = useState(campaign.status);
  const [mode, setMode] = useState<"ai" | "custom">(campaign.botConfig?.mode || "custom");
  const [goal, setGoal] = useState(campaign.botConfig?.goal || "");
  const [tone, setTone] = useState(campaign.botConfig?.tone || "friendly, concise, helpful");
  const [flow, setFlow] = useState(campaign.botConfig?.flow || []);
  const [theme, setTheme] = useState(campaign.botConfig?.theme || "#6d3ef7");
  const [headerText, setHeaderText] = useState(campaign.botConfig?.headerText || "Chat with us");
  const [bubbleIcon, setBubbleIcon] = useState(campaign.botConfig?.bubbleIcon || "");
  const [logo, setLogo] = useState(campaign.botConfig?.logo || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const branding = { theme, headerText, bubbleIcon, logo };
    const botConfig =
      mode === "ai"
        ? { ...campaign.botConfig, mode, goal, tone, flow: [], ...branding }
        : { ...campaign.botConfig, mode, flow, ...branding };

    await fetch(`/api/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, botConfig }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function handleImageUpload(file: File, setter: (url: string) => void) {
    const dataUrl = await resizeImage(file, 300, 0.8);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
    const data = await res.json();
    if (res.ok) setter(data.url);
  }

  async function handleDelete() {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
    router.push("/dashboard/campaigns");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
        <label className="text-sm font-medium text-gray-700 block mb-2">Campaign status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Branding</h3>
        <p className="text-xs text-gray-500 mb-4">
          Customize how the chat widget looks on your landing page — your color, your logo, your wording.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm text-gray-700">
            Widget color
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </label>

          <label className="text-sm text-gray-700">
            Header text
            <input
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="Chat with us"
              className="block w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </label>

          <ImagePicker
            label="Chat bubble icon"
            hint="Replaces the default 💬 icon (recommend a square logo)"
            value={bubbleIcon}
            onUpload={(file) => handleImageUpload(file, setBubbleIcon)}
            onClear={() => setBubbleIcon("")}
            round
          />

          <ImagePicker
            label="Header logo"
            hint="Shown next to the header text inside the chat window"
            value={logo}
            onUpload={(file) => handleImageUpload(file, setLogo)}
            onClear={() => setLogo("")}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
        <label className="text-sm font-medium text-gray-700 block mb-3">Conversation mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("ai")}
            className={`flex-1 text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
              mode === "ai" ? "border-brand-400 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600"
            }`}
          >
            <span className="font-medium block">✨ AI-based</span>
            <span className="text-xs text-gray-500">Free-form conversation</span>
          </button>
          <button
            onClick={() => setMode("custom")}
            className={`flex-1 text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
              mode === "custom" ? "border-brand-400 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600"
            }`}
          >
            <span className="font-medium block">☑️ Custom flow</span>
            <span className="text-xs text-gray-500">Guided step-by-step</span>
          </button>
        </div>
      </div>

      {mode === "ai" ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 flex flex-col gap-3">
          <label className="text-sm text-gray-700">
            Bot goal
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              className="block w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </label>
          <label className="text-sm text-gray-700">
            Tone
            <input
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="block w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </label>
        </div>
      ) : (
        <div>
          <div className="mb-3">
            <h3 className="font-semibold text-gray-900">Chat flow</h3>
            <p className="text-sm text-gray-500">
              Build the conversation your visitors see — no code needed. Add a question, give it a few
              tap-to-answer options, drop in an image for your campaign banner, and end with a contact step
              to capture email + WhatsApp.
            </p>
          </div>
          <FlowBuilder initialFlow={flow} onChange={setFlow} />
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-gradient text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
        >
          <Trash2 size={14} /> Delete campaign
        </button>
      </div>
    </div>
  );
}

function ImagePicker({
  label,
  hint,
  value,
  onUpload,
  onClear,
  round,
}: {
  label: string;
  hint: string;
  value: string;
  onUpload: (file: File) => void;
  onClear: () => void;
  round?: boolean;
}) {
  const inputId = label.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className="text-sm text-gray-700">
      <label>{label}</label>
      <p className="text-xs text-gray-400 mb-1">{hint}</p>
      <div className="flex items-center gap-3 mt-1">
        {value ? (
          <div className="relative">
            <img
              src={value}
              className={`w-12 h-12 object-cover border border-gray-200 ${round ? "rounded-full" : "rounded-lg"}`}
              alt=""
            />
            <button
              type="button"
              onClick={onClear}
              className="absolute -top-1.5 -right-1.5 bg-white border border-gray-200 rounded-full p-0.5 shadow-card"
            >
              <X size={10} />
            </button>
          </div>
        ) : (
          <div className={`w-12 h-12 border border-dashed border-gray-300 flex items-center justify-center text-gray-300 ${round ? "rounded-full" : "rounded-lg"}`}>
            <ImageIcon size={16} />
          </div>
        )}
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-brand-600 border border-brand-200 bg-brand-50 px-3 py-2 rounded-lg cursor-pointer hover:bg-brand-100"
        >
          Upload
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
      </div>
    </div>
  );
}

function resizeImage(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
