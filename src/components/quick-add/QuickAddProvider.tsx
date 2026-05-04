"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { QuickAddForm } from "./QuickAddForm";

interface QuickAddCtx {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const QuickAddContext = createContext<QuickAddCtx | null>(null);

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  // emit a custom event on success so any list listening can refresh
  useEffect(() => {
    function onCreated() {
      setOpen(false);
    }
    window.addEventListener("nuray:quick-add:created", onCreated);
    return () => window.removeEventListener("nuray:quick-add:created", onCreated);
  }, []);

  return (
    <QuickAddContext.Provider value={{ open, close, isOpen }}>
      {children}
      <Modal
        open={isOpen}
        onClose={close}
        title="Añadir rápido"
        description="Crea una tarea o un recordatorio en pocos segundos."
        size="md"
      >
        <QuickAddForm onDone={close} />
      </Modal>
    </QuickAddContext.Provider>
  );
}

export function useQuickAdd() {
  const ctx = useContext(QuickAddContext);
  if (!ctx) {
    return { open: () => undefined, close: () => undefined, isOpen: false };
  }
  return ctx;
}
