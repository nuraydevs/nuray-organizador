"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, Bell, BellOff, BellRing, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { ReminderEditor } from "@/components/reminders/ReminderEditor";
import { TargetsManager } from "@/components/reminders/TargetsManager";
import {
  listReminders,
  retryReminder,
  updateReminder,
} from "@/lib/repositories/reminders";
import { listTargets } from "@/lib/repositories/notificationTargets";
import type { NotificationTarget, Reminder, ReminderStatus } from "@/types/database";
import { smartDateLabel } from "@/lib/utils/dates";

const TABS: { value: ReminderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "scheduled", label: "Próximos" },
  { value: "sent", label: "Enviados" },
  { value: "failed", label: "Fallidos" },
  { value: "cancelled", label: "Cancelados" },
];

export default function RemindersPage() {
  const toast = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [targets, setTargets] = useState<NotificationTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReminderStatus | "all">("scheduled");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [targetsOpen, setTargetsOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [r, ts] = await Promise.all([listReminders(), listTargets()]);
      setReminders(r);
      setTargets(ts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  const targetsById = useMemo(() => {
    const m = new Map<string, NotificationTarget>();
    targets.forEach((t) => m.set(t.id, t));
    return m;
  }, [targets]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (tab === "all") return reminders;
    return reminders.filter((r) => r.status === tab);
  }, [reminders, tab]);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(r: Reminder) {
    setEditing(r);
    setEditorOpen(true);
  }
  function onSaved(r: Reminder) {
    setReminders((prev) => {
      const i = prev.findIndex((x) => x.id === r.id);
      if (i === -1) return [r, ...prev];
      const copy = prev.slice();
      copy[i] = r;
      return copy;
    });
    setEditorOpen(false);
  }
  function onDeleted(id: string) {
    setReminders((prev) => prev.filter((x) => x.id !== id));
    setEditorOpen(false);
  }

  async function onCancel(r: Reminder) {
    try {
      const updated = await updateReminder(r.id, { status: "cancelled" });
      setReminders((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
      toast.success("Recordatorio cancelado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function onRetry(r: Reminder) {
    try {
      const updated = await retryReminder(r.id);
      setReminders((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
      toast.success("Recordatorio reactivado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <>
      <PageHeader
        title="Recordatorios"
        description="Avisos en la app o por Telegram."
        actions={
          <>
            <Button variant="outline" onClick={() => setTargetsOpen(true)}>
              <Users size={14} /> Destinatarios
            </Button>
            <Button variant="outline" onClick={load}>
              <RefreshCcw size={14} /> Refrescar
            </Button>
            <Button onClick={openNew}>
              <Plus size={14} /> Nuevo recordatorio
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-1 mb-3">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`h-8 px-3 rounded-md text-xs ${
              tab === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-white border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <EmptyState
          title="Error al cargar"
          description={error}
          action={<Button onClick={load}>Reintentar</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Bell size={20} />}
          title="No hay recordatorios programados"
          description="Crea un recordatorio para recibir un aviso en su momento."
          action={
            <Button onClick={openNew}>
              <Plus size={14} /> Nuevo recordatorio
            </Button>
          }
        />
      ) : (
        <div className="bg-white border border-border rounded-lg divide-y divide-border">
          {filtered.map((r) => {
            const overdue =
              r.status === "scheduled" && new Date(r.remind_at).getTime() < Date.now();
            const target = r.notification_target_id
              ? targetsById.get(r.notification_target_id)
              : null;
            const recipientLabel =
              r.channel === "telegram"
                ? target
                  ? `${target.name}${target.type === "team" ? " (equipo)" : ""}`
                  : "Global"
                : null;
            return (
              <div
                key={r.id}
                className="flex items-start gap-3 px-3 sm:px-4 py-3 hover:bg-muted/30"
              >
                <div className="mt-1">
                  {r.status === "sent" ? (
                    <BellRing size={16} className="text-emerald-600" />
                  ) : r.status === "failed" ? (
                    <BellOff size={16} className="text-rose-600" />
                  ) : r.status === "cancelled" ? (
                    <BellOff size={16} className="text-muted-foreground" />
                  ) : (
                    <Bell size={16} className={overdue ? "text-amber-600" : "text-muted-foreground"} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{r.title}</span>
                    <Badge tone={r.channel === "telegram" ? "info" : "muted"}>
                      {r.channel}
                    </Badge>
                    {overdue ? <Badge tone="warning">Vencido</Badge> : null}
                    <Badge
                      tone={
                        r.status === "sent"
                          ? "success"
                          : r.status === "failed"
                          ? "danger"
                          : r.status === "cancelled"
                          ? "muted"
                          : "info"
                      }
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {smartDateLabel(r.remind_at)}
                    {recipientLabel ? <span> · → {recipientLabel}</span> : null}
                    {r.message ? <span> · {r.message.slice(0, 80)}</span> : null}
                  </div>
                  {r.error_message ? (
                    <div className="text-[11px] text-destructive mt-0.5">
                      Error: {r.error_message}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col sm:flex-row gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                    Editar
                  </Button>
                  {r.status === "scheduled" ? (
                    <Button size="sm" variant="ghost" onClick={() => onCancel(r)}>
                      Cancelar
                    </Button>
                  ) : null}
                  {r.status === "failed" ? (
                    <Button size="sm" variant="outline" onClick={() => onRetry(r)}>
                      Reintentar
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ReminderEditor
        open={editorOpen}
        reminder={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />

      <TargetsManager open={targetsOpen} onClose={() => setTargetsOpen(false)} />
    </>
  );
}
