"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "warning" | "error" | "info";
interface Toast { id: number; tone: ToastTone; title: string; description?: string }

const ToastContext = React.createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={cn("pointer-events-auto flex gap-3 rounded-md border bg-white px-3.5 py-3 shadow-lg animate-fade-in-up", t.tone === "success" ? "border-emerald-200" : t.tone === "error" ? "border-red-200" : t.tone === "warning" ? "border-amber-200" : "border-slate-200")}>
            <div className="mt-0.5 shrink-0">
              {t.tone === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              {t.tone === "error" && <XCircle className="h-4 w-4 text-red-600" />}
              {t.tone === "warning" && <AlertTriangle className="h-4 w-4 text-amber-600" />}
              {t.tone === "info" && <Info className="h-4 w-4 text-sky-600" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-900">{t.title}</div>
              {t.description && <div className="mt-0.5 text-xs text-slate-500">{t.description}</div>}
            </div>
            <button className="text-slate-400 hover:text-slate-600" onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} aria-label="閉じる">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.push;
}
