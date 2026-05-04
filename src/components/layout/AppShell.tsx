"use client";

import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { MobileTopBar } from "./MobileTopBar";
import { QuickAddProvider } from "@/components/quick-add/QuickAddProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <QuickAddProvider>
      <div className="min-h-screen bg-muted/40 flex">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <MobileTopBar />
          <main
            className="flex-1 px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-24 lg:pb-10"
            style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
          >
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </main>
          <MobileNav />
        </div>
      </div>
    </QuickAddProvider>
  );
}
