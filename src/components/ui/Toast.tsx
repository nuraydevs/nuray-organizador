"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let _id = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++_id;
      setToasts((t) => [...t, { id, message, variant }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove],
  );

  const ctx: ToastContextValue = {
    show,
    success: (m) => show(m, "success"),
    error: (m) => show(m, "error"),
    info: (m) => show(m, "info"),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-full max-w-sm px-3 sm:bottom-6 pointer-events-none">
        {toasts.map((t) => (
          <ToastBubble key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastBubble({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const Icon =
    item.variant === "success" ? CheckCircle2 : item.variant === "error" ? AlertCircle : Info;
  const tone =
    item.variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : item.variant === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-border bg-white text-foreground";
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 shadow-card text-sm",
        tone,
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span className="flex-1 leading-snug">{item.message}</span>
      <button
        type="button"
        onClick={onClose}
        className="text-current/70 hover:text-current"
        aria-label="Cerrar aviso"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // SSR-safe stub
    return {
      show: () => undefined,
      success: () => undefined,
      error: () => undefined,
      info: () => undefined,
    } as ToastContextValue;
  }
  return ctx;
}

