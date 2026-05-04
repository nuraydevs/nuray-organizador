"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, LogOut } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { clearAccess } from "@/components/access/AccessGate";
import { APP_VERSION } from "@/types/app";

interface StatusFlags {
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
  accessCode: boolean;
  telegramBotToken: boolean;
  telegramChatId: boolean;
  reminderCronSecret: boolean;
  openaiApiKey: boolean;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<StatusFlags | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: StatusFlags) => setStatus(d))
      .catch(() => setError("No se pudo obtener el estado del servidor"));
  }, []);

  function onLogout() {
    clearAccess();
    window.location.href = "/";
  }

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Estado del entorno y opciones internas."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Supabase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              ok={status?.supabaseUrl ?? false}
              label="NEXT_PUBLIC_SUPABASE_URL"
            />
            <Row
              ok={status?.supabaseAnonKey ?? false}
              label="NEXT_PUBLIC_SUPABASE_ANON_KEY"
            />
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : (
              <p className="text-xs text-muted-foreground pt-2">
                La aplicación lee y escribe en Supabase con la anon key. Asegúrate
                de haber ejecutado <code>supabase/schema.sql</code>.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Telegram</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row ok={status?.telegramBotToken ?? false} label="TELEGRAM_BOT_TOKEN" />
            <Row ok={status?.telegramChatId ?? false} label="TELEGRAM_CHAT_ID" />
            <Row
              ok={status?.reminderCronSecret ?? false}
              label="REMINDER_CRON_SECRET"
            />
            <p className="text-xs text-muted-foreground pt-2">
              Vercel Cron llamará a <code>/api/reminders/send-due</code> cada 5
              minutos. Consulta <code>docs/TELEGRAM_SETUP.md</code> para ver la
              configuración.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OpenAI (transcripción)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row ok={status?.openaiApiKey ?? false} label="OPENAI_API_KEY" />
            <p className="text-xs text-muted-foreground pt-2">
              Se usa solo en el endpoint <code>/api/transcribe</code> para
              convertir notas de voz del Inbox en texto. Si no está
              configurada, el modo audio mostrará un error claro al pulsar
              Transcribir.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acceso interno</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row ok={status?.accessCode ?? false} label="NURAY_ACCESS_CODE" />
            <p className="text-xs text-muted-foreground">
              Acceso protegido por código compartido. No es seguridad fuerte;
              solo barrera ligera para uso interno.
            </p>
            <div className="pt-2">
              <Button variant="outline" onClick={onLogout}>
                <LogOut size={14} /> Salir
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aplicación</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Versión</span>
              <span className="font-mono text-xs">{APP_VERSION}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Software interno para Nuray. Datos almacenados en Supabase.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Row({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-xs">{label}</span>
      {ok ? (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
          <CheckCircle2 size={14} />
          Configurado
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-rose-700">
          <XCircle size={14} />
          No configurado
        </span>
      )}
    </div>
  );
}
