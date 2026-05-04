"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full bg-white sm:rounded-lg shadow-card border border-border max-h-[95vh] flex flex-col",
          widthClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-4 py-3 border-b border-border shrink-0">
          <div>
            {title ? <h2 className="text-sm font-semibold">{title}</h2> : null}
            {description ? (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-4 py-4 overflow-y-auto">{children}</div>
        {footer ? (
          <div className="border-t border-border px-4 py-3 flex flex-wrap gap-2 justify-end shrink-0">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title = "¿Confirmar?",
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-md border border-border bg-white text-sm hover:bg-muted"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "h-9 px-4 rounded-md text-sm font-medium text-white",
              destructive ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90",
              loading && "opacity-60 cursor-not-allowed",
            )}
          >
            {loading ? "Procesando..." : confirmText}
          </button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{description}</p>
    </Modal>
  );
}
