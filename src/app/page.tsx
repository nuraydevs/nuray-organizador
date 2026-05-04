"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AccessGate } from "@/components/access/AccessGate";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <AccessGate>
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Cargando...
      </div>
    </AccessGate>
  );
}
