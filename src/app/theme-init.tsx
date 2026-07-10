"use client";

import { useEffect } from "react";

export default function ThemeInit() {
  useEffect(() => {
    try {
      const accent = localStorage.getItem("leadbot_accent_color");
      if (accent) document.documentElement.style.setProperty("--accent-color", accent);
      const font = localStorage.getItem("leadbot_font_family");
      if (font) document.documentElement.style.setProperty("--app-font", font);
    } catch {
      // localStorage unavailable (e.g. privacy mode) — fall back to defaults, non-fatal
    }
  }, []);

  return null;
}
