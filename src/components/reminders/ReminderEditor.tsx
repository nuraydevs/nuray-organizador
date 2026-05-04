"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type {
  NotificationTarget,
  Reminder,
  ReminderChannel,
  ReminderRelatedType,
} from "@/types/database";
import {
  createReminder,
  deleteReminder,
  updateReminder,
} from "@/lib/repositories/reminders";
import { listTargets } from "@/lib/repositories/notificationTargets";
import { fromInputDateTime, toInputDateTime } from "@/lib/utils/dates";

const RELATED_TYPES: { value: ReminderRelatedType; label: string }[] = [
  { value: "custom", label: "Sin relación" },
  { value: "task", label: "Tarea" },
  { value: "event", label: "Evento" },
  { value: "client", label: "Cliente" },
  { value: "project", label: "Proyecto" },
];

export function ReminderEditor({
  open,
  reminder,
  defaults,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  reminder: Reminder | null;
  defaults?: Partial<Reminder>;
  onClose: () => void;
  onSaved: (r: Reminder) => void;
  onDeleted?: (id: string) => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [channel, setChannel] = useState<ReminderChannel>("app");
  const [relatedType, setRelatedType] = useState<ReminderRelatedType>("custom");
  const [targetId, setTargetId] = useState<string>("");
  const [targets, setTargets] = useState<NotificationTarget[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(reminder?.title ?? defaults?.title ?? "");
    setMessage(reminder?.message ?? defaults?.message ?? "");
    setRemindAt(toInputDateTime(reminder?.remind_at ?? defaults?.remind_at));
    setChannel(reminder?.channel ?? defaults?.channel ?? "app");
    setRelatedType(
      (reminder?.related_type ?? defaults?.related_type ?? "custom") as ReminderRelatedType,
    );
    setTargetId(reminder?.notification_target_id ?? defaults?.notification_target_id ?? "");
    setConfirmDelete(false);
    listTargets(true)
      .then((ts) => {
        setTargets(ts);
        // If creating a new reminder and no target selected, prefer the default
        if (!reminder && !targetId) {
          const def = ts.find((t) => t.is_default);
          if (def) setTargetId(def.id);
        }
      })
      .catch(() => setTargets([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reminder, defaults]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    const remindIso = fromInputDateTime(remindAt);
    if (!remindIso) {
      toast.error("Fecha de recordatorio no válida");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<Reminder> = {
        title,
        message: message.trim() || null,
        remind_at: remindIso,
        channel,
        related_type: relatedType,
        related_id: reminder?.related_id ?? defaults?.related_id ?? null,
        notification_target_id: targetId || null,
        // when re-saving, keep status; for new, default to scheduled
        status: reminder?.status ?? "scheduled",
      };
      const saved = reminder
        ? await updateReminder(reminder.id, payload)
        : await createReminder(payload);
      toast.success(reminder ? "Recordatorio actualizado" : "Recordatorio creado");
      onSaved(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!reminder || submitting) return;
    setSubmitting(true);
    try {
      await deleteReminder(reminder.id);
      toast.success("Recordatorio eliminado");
      onDeleted?.(reminder.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={reminder ? "Editar recordatorio" : "Nuevo recordatorio"}
      size="md"
      footer={
        <div className="flex w-full items-center justify-between">
          {reminder ? (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                ¿Borrar?
                <button
                  type="button"
                  className="text-destructive font-medium"
                  onClick={onDelete}
                  disabled={submitting}
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={submitting}
                >
                  No
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                disabled={submitting}
              >
                Eliminar
              </Button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" form="reminder-editor" loading={submitting}>
              {reminder ? "Guardar cambios" : "Crear recordatorio"}
            </Button>
          </div>
        </div>
      }
    >
      <form id="reminder-editor" onSubmit={onSubmit} className="space-y-3">
        <Field label="Título" htmlFor="r-title">
          <Input
            id="r-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            maxLength={200}
          />
        </Field>
        <Field label="Mensaje" htmlFor="r-msg">
          <Textarea
            id="r-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Texto que se enviará..."
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Fecha y hora" htmlFor="r-at">
            <Input
              id="r-at"
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              required
            />
          </Field>
          <Field label="Canal" htmlFor="r-ch">
            <Select
              id="r-ch"
              value={channel}
              onChange={(e) => setChannel(e.target.value as ReminderChannel)}
            >
              <option value="app">App</option>
              <option value="telegram">Telegram</option>
            </Select>
          </Field>
        </div>
        {channel === "telegram" ? (
          <Field
            label="Enviar a"
            htmlFor="r-target"
            hint={
              targets.length === 0
                ? "Sin destinatarios. Se usará TELEGRAM_CHAT_ID global."
                : undefined
            }
          >
            <Select
              id="r-target"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              <option value="">— Global (TELEGRAM_CHAT_ID) —</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.type === "team" ? "equipo" : "individual"}
                  {t.is_default ? " · por defecto" : ""}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Relacionado con" htmlFor="r-rel">
          <Select
            id="r-rel"
            value={relatedType}
            onChange={(e) => setRelatedType(e.target.value as ReminderRelatedType)}
          >
            {RELATED_TYPES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
