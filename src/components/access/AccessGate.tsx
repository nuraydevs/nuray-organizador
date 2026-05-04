"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

const STORAGE_KEY = "nuray.access.v1";
const COOKIE_KEY = "nuray_access";

export function hasAccessClient() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "ok";
  } catch {
    return false;
  }
}

export function clearAccess() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  if (typeof document !== "undefined") {
    document.cookie = `${COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

export function AccessGate({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setGranted(hasAccessClient());
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Código incorrecto");
        return;
      }
      try {
        localStorage.setItem(STORAGE_KEY, "ok");
      } catch {
        // ignore storage errors
      }
      setGranted(true);
    } catch {
      setError("No se pudo verificar el código.");
    } finally {
      setSubmitting(false);
    }
  }

  if (granted === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Cargando...
      </div>
    );
  }

  if (!granted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm bg-white rounded-lg border border-border shadow-card p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-foreground">
            <Lock size={18} />
            <h1 className="text-base font-semibold">Acceso a Nuray Workspace</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Espacio interno. Introduce el código de acceso para continuar.
          </p>
          <Field label="Código de acceso" htmlFor="access-code" error={error ?? undefined}>
            <Input
              id="access-code"
              type="password"
              autoComplete="current-password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" loading={submitting} className="w-full">
            Entrar
          </Button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
