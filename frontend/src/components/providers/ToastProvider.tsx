"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cx } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

type ToastTone = "success" | "danger" | "info";
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<{ toast: (message: string, tone?: ToastTone) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "flex items-center gap-2 rounded-md border bg-surface px-3 py-2.5 text-body-sm shadow-md",
              t.tone === "success" && "border-success-subtle text-success",
              t.tone === "danger" && "border-danger-subtle text-danger",
              t.tone === "info" && "border-info-subtle text-info",
            )}
          >
            <Icon name={t.tone === "danger" ? "alert" : t.tone === "info" ? "info" : "check"} size={16} />
            <span className="text-text">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
