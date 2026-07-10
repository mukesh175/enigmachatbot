"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Camera, Bell, Volume2, Palette, Monitor } from "lucide-react";
import { useToast } from "@/lib/toast";

const ACCENT_COLORS = [
  { name: "Coral", value: "#ed5e4e" },
  { name: "Indigo", value: "#2f3192" },
  { name: "Navy", value: "#1a1c5c" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
];

const SOUND_OPTIONS = [
  { label: "Chime", freq: 880 },
  { label: "Ping", freq: 1200 },
  { label: "Pop", freq: 600 },
  { label: "Silent", freq: 0 },
];

function playTone(freq: number, volume: number) {
  if (freq === 0) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {}
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState("");
  const [notifyEmailOnLead, setNotifyEmailOnLead] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundChoice, setSoundChoice] = useState("Chime");
  const [volume, setVolume] = useState(60);
  const [desktopNotifs, setDesktopNotifs] = useState(false);
  const [accentColor, setAccentColor] = useState("#ed5e4e");
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
    setSoundChoice(localStorage.getItem("leadbot_sound_choice") || "Chime");
    setVolume(Number(localStorage.getItem("leadbot_sound_volume") || 60));
    setDesktopNotifs(localStorage.getItem("leadbot_desktop_notifs") === "on");
    setAccentColor(localStorage.getItem("leadbot_accent_color") || "#ed5e4e");
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
  }

  function selectSound(label: string, freq: number) {
    setSoundChoice(label);
    localStorage.setItem("leadbot_sound_choice", label);
    playTone(freq, volume / 100);
  }

  function handleVolumeChange(v: number) {
    setVolume(v);
    localStorage.setItem("leadbot_sound_volume", String(v));
  }

  async function requestDesktopNotifs() {
    if (!("Notification" in window)) {
      toast.show("Desktop notifications aren't supported in this browser", "error");
      return;
    }
    const permission = await Notification.requestPermission();
    const enabled = permission === "granted";
    setDesktopNotifs(enabled);
    localStorage.setItem("leadbot_desktop_notifs", enabled ? "on" : "off");
    if (!enabled) toast.show("Permission denied — enable notifications in your browser settings", "error");
  }

  function sendTestNotification() {
    if (Notification.permission === "granted") {
      new Notification("LeadBot", { body: "This is a test notification 👋" });
    } else {
      toast.show("Enable desktop notifications first", "error");
    }
  }

  function selectAccent(color: string) {
    setAccentColor(color);
    localStorage.setItem("leadbot_accent_color", color);
    document.documentElement.style.setProperty("--lb-accent", color);
    toast.show("Accent color updated", "success");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Profile & Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Manage your profile, appearance, and notification preferences.</p>

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
        <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Palette size={15} /> Colour theme
        </h3>
        <p className="text-xs text-gray-500 mb-4">Pick the accent color used across your dashboard buttons and highlights.</p>
        <div className="flex flex-wrap gap-3">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => selectAccent(c.value)}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center border-2"
                style={{ backgroundColor: c.value, borderColor: accentColor === c.value ? "#111" : "transparent" }}
              >
                {accentColor === c.value && <span className="text-white text-xs">✓</span>}
              </span>
              <span className="text-[11px] text-gray-500">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Volume2 size={15} /> Notification sound
        </h3>
        <p className="text-xs text-gray-500 mb-4">Played when a new lead comes in while the dashboard is open.</p>
        <div className="flex flex-col gap-2">
          {SOUND_OPTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => selectSound(s.label, s.freq)}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                soundChoice === s.label ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600"
              }`}
            >
              {s.label}
              {soundChoice === s.label && <span className="text-xs text-gray-400">Selected · tap to preview</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Alerts</h3>

        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <div className="text-sm text-gray-900">Play sound on new notifications</div>
          </div>
          <ToggleSwitch checked={soundEnabled} onChange={toggleSound} />
        </div>

        <div className="py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-900">Volume</span>
            <span className="text-xs text-gray-400">{volume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-full accent-brand-500"
          />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Monitor size={16} className="text-gray-400" />
            <div>
              <div className="text-sm text-gray-900">Desktop notifications</div>
              <button onClick={sendTestNotification} className="text-xs text-brand-600 font-medium mt-1">
                Send test notification
              </button>
            </div>
          </div>
          <ToggleSwitch checked={desktopNotifs} onChange={requestDesktopNotifs} />
        </div>

        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Bell size={16} className="text-gray-400" />
            <div>
              <div className="text-sm text-gray-900">New lead email alerts</div>
              <div className="text-xs text-gray-400">Notify by email when a new lead comes in</div>
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
