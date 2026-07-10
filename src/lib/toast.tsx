"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Toast = { id: number; message: string; type: "loading" | "success" | "error" };

const ToastContext = createContext<{
  show: (message: string, type?: Toast["type"]) => number;
  update: (id: number, message: string, type: Toast["type"]) => void;
  dismiss: (id: number) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let nextId = 0;

  const show = useCallback((message: string, type: Toast["type"] = "loading") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    if (type !== "loading") {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
    }
    return id;
  }, []);

  const update = useCallback((id: number, message: string, type: Toast["type"]) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, message, type } : t)));
    if (type !== "loading") {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
    }
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show, update, dismiss }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 bg-white shadow-popover border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800 min-w-[220px]"
          >
            {t.type === "loading" && <Loader2 size={16} className="animate-spin text-brand-500 shrink-0" />}
            {t.type === "success" && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
            {t.type === "error" && <XCircle size={16} className="text-red-500 shrink-0" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
