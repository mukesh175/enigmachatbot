"use client";

import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("leadbot_install_dismissed") === "true") return;

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
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
