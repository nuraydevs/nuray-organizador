import { AccessGate } from "@/components/access/AccessGate";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccessGate>
      <AppShell>{children}</AppShell>
    </AccessGate>
  );
}
