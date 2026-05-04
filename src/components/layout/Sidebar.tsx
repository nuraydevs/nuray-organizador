"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  ListChecks,
  Users,
  FolderKanban,
  Bell,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tareas", icon: ListChecks },
  { href: "/calendar", label: "Calendario", icon: Calendar },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/projects", label: "Proyectos", icon: FolderKanban },
  { href: "/reminders", label: "Recordatorios", icon: Bell },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-60 shrink-0 border-r border-border bg-white flex-col">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
            N
          </div>
          <div>
            <div className="text-sm font-semibold leading-none">Nuray</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Workspace</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm",
                active
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-3 border-t border-border text-[11px] text-muted-foreground">
        Acceso interno
      </div>
    </aside>
  );
}
