"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Settings, LogOut } from "lucide-react";
import { NAV_ITEMS } from "./Sidebar";
import { useQuickAdd } from "@/components/quick-add/QuickAddProvider";
import { clearAccess } from "@/components/access/AccessGate";

export function MobileTopBar() {
  const pathname = usePathname();
  const quickAdd = useQuickAdd();
  const current = NAV_ITEMS.find((i) => pathname?.startsWith(i.href));
  const title = current?.label ?? "Nuray Workspace";

  function onLogout() {
    clearAccess();
    window.location.href = "/";
  }

  return (
    <header
      className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-border"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between px-3 h-12">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
            N
          </div>
          <span className="text-sm font-semibold truncate">{title}</span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => quickAdd.open()}
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1"
            aria-label="Añadir rápido"
          >
            <Plus size={16} />
            Añadir
          </button>
          <Link
            href="/settings"
            className="h-9 w-9 rounded-md hover:bg-muted inline-flex items-center justify-center text-muted-foreground"
            aria-label="Configuración"
          >
            <Settings size={18} />
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="h-9 w-9 rounded-md hover:bg-muted inline-flex items-center justify-center text-muted-foreground"
            aria-label="Salir"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
