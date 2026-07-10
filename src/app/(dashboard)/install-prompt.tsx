"use client";

import { useEffect, useState } from "react";

// Shared across the app so Settings can also offer a manual "Install" button
// using the same captured event, without needing two separate listeners.
declare global {
  interface Window {
    __leadbotInstallPrompt?: any;
  }
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    console.log("[LeadBot PWA] InstallPrompt mounted. Dismissed flag:", localStorage.getItem("leadbot_install_dismissed"));

    if (localStorage.getItem("leadbot_install_dismissed") === "true") {
      console.log("[LeadBot PWA] Install prompt was previously dismissed — skipping. Clear 'leadbot_install_dismissed' in localStorage to re-test.");
      return;
    }

    function handler(e: Event) {
      console.log("[LeadBot PWA] beforeinstallprompt fired ✅");
      e.preventDefault();
      window.__leadbotInstallPrompt = e;
      setDeferredPrompt(e);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handler);

    // If the event hasn't fired within a few seconds, log a hint — most
    // commonly this means the browser doesn't support it (Safari/Firefox),
    // the app is already installed, or Chrome's engagement heuristic hasn't
    // been met yet (needs a bit of interaction time on the site first).
    const timeout = setTimeout(() => {
      if (!window.__leadbotInstallPrompt) {
        console.log(
          "[LeadBot PWA] beforeinstallprompt has not fired after 4s. This is normal in Safari/Firefox (unsupported), " +
          "if already installed, or if Chrome hasn't met its engagement heuristic yet. Check DevTools > Application > Manifest for errors."
        );
      }
    }, 4000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timeout);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem("leadbot_install_dismissed", "true");
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9998] max-w-xs bg-surface text-white rounded-2xl shadow-popover p-4 border border-surface-border">
      <p className="text-sm font-semibold mb-3">Install LeadBot as an app for quicker access?</p>
      <div className="flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 bg-accent-gradient text-white text-sm font-medium py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 border border-white/20 text-white text-sm font-medium py-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
