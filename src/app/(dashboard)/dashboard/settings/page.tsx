"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Camera, Bell, Volume2 } from "lucide-react";
import { useToast } from "@/lib/toast";

export default function SettingsPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState("");
  const [notifyEmailOnLead, setNotifyEmailOnLead] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setAvatarUrl(d.settings.avatarUrl || "");
          setNotifyEmailOnLead(d.settings.notifyEmailOnLead ?? true);
        }
      });
    setSoundEnabled(localStorage.getItem("leadbot_notify_sound") !== "off");
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const dataUrl = await resizeImage(file, 200, 0.85);
    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
    const uploadData = await uploadRes.json();
    setUploading(false);

    if (uploadRes.ok) {
      setAvatarUrl(uploadData.url);
      await saveSettings({ avatarUrl: uploadData.url, notifyEmailOnLead });
    }
  }

  async function saveSettings(patch: { avatarUrl?: string; notifyEmailOnLead?: boolean }) {
    const toastId = toast.show("Saving...", "loading");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    toast.update(toastId, res.ok ? "Settings saved" : "Failed to save settings", res.ok ? "success" : "error");
  }

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("leadbot_notify_sound", next ? "on" : "off");
    toast.show(next ? "Notification sound enabled" : "Notification sound muted", "success");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Profile & Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Manage your profile picture and notification preferences.</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Profile</h3>
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} className="w-16 h-16 rounded-full object-cover border border-gray-200" alt="" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xl font-semibold">
                {session?.user?.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 bg-white border border-gray-200 rounded-full p-1.5 shadow-card hover:bg-gray-50"
            >
              <Camera size={13} className="text-gray-600" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <div className="font-medium text-gray-900">{session?.user?.name}</div>
            <div className="text-sm text-gray-500">{session?.user?.email}</div>
            <div className="text-xs font-medium text-brand-600 mt-1 capitalize">
              {(session?.user as any)?.role || "admin"}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Notification preferences</h3>

        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Bell size={16} className="text-gray-400" />
            <div>
              <div className="text-sm text-gray-900">New lead alerts</div>
              <div className="text-xs text-gray-400">Get notified when a new lead comes in</div>
            </div>
          </div>
          <ToggleSwitch
            checked={notifyEmailOnLead}
            onChange={(v) => {
              setNotifyEmailOnLead(v);
              saveSettings({ avatarUrl, notifyEmailOnLead: v });
            }}
          />
        </div>

        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Volume2 size={16} className="text-gray-400" />
            <div>
              <div className="text-sm text-gray-900">Notification sound</div>
              <div className="text-xs text-gray-400">Play a sound when the bell badge updates</div>
            </div>
          </div>
          <ToggleSwitch checked={soundEnabled} onChange={toggleSound} />
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative ${checked ? "bg-brand-500" : "bg-gray-200"}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
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
