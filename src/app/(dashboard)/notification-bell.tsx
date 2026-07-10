"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

const SOUND_FREQS: Record<string, number> = { Chime: 880, Ping: 1200, Pop: 600, Silent: 0 };

// Plays a short beep using the Web Audio API — no audio file needed to ship.
function playBeep() {
  const soundChoice = localStorage.getItem("leadbot_sound_choice") || "Chime";
  const freq = SOUND_FREQS[soundChoice] ?? 880;
  if (freq === 0) return;
  const volume = Number(localStorage.getItem("leadbot_sound_volume") || 60) / 100;

  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = freq;
    gain.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Web Audio blocked (e.g. before any user interaction) — fail silently
  }
}

export default function NotificationBell() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const lastCount = useRef<number | null>(null);
  const soundEnabled = useRef(true);

  useEffect(() => {
    soundEnabled.current = localStorage.getItem("leadbot_notify_sound") !== "off";

    async function poll() {
      try {
        const res = await fetch("/api/leads");
        const data = await res.json();
        const total = (data.leads || []).length;

        if (lastCount.current !== null && total > lastCount.current) {
          const newOnes = total - lastCount.current;
          setUnread((prev) => prev + newOnes);
          if (soundEnabled.current) playBeep();
          if (localStorage.getItem("leadbot_desktop_notifs") === "on" && Notification.permission === "granted") {
            new Notification("New lead!", { body: `You have ${newOnes} new lead${newOnes > 1 ? "s" : ""}.` });
          }
        }
        lastCount.current = total;
      } catch {
        // network hiccup — just try again next interval
      }
    }

    poll();
    const interval = setInterval(poll, 20000); // check every 20s
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={() => {
        setUnread(0);
        router.push("/dashboard/leads");
      }}
      className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
      title="New leads"
    >
      <Bell size={19} />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
