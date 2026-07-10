"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopySnippet({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative">
      <pre className="bg-surface text-green-400 rounded-xl p-4 text-xs overflow-x-auto pr-12">{snippet}</pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
      >
        {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
      </button>
    </div>
  );
}
