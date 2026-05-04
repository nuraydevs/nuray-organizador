"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Star, ToggleLeft, ToggleRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { NOTIFICATION_TARGET_TYPES } from "@/types/app";
import type { NotificationTarget, NotificationTargetType } from "@/types/database";
import {
  createTarget,
  deleteTarget,
  listTargets,
  setAsDefault,
  updateTarget,
} from "@/lib/repositories/notificationTargets";

export function TargetsManager({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [targets, setTargets] = useState<NotificationTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationTarget | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const ts = await listTargets(false);
      setTargets(ts);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onToggleActive(t: NotificationTarget) {
    try {
      const updated = await updateTarget(t.id, { is_active: !t.is_active });
      setTargets((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function onMarkDefault(t: NotificationTarget) {
    try {
      await setAsDefault(t.id);
      await load();
      toast.success(`${t.name} marcado como por defecto`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function onDelete(t: NotificationTarget) {
    try {
      await deleteTarget(t.id);
      setTargets((prev) => prev.filter((x) => x.id !== t.id));
      setConfirmDel(null);
      toast.success("Destinatario eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(t: NotificationTarget) {
    setEditing(t);
    setEditorOpen(true);
  }
  function onSaved(t: NotificationTarget) {
    setTargets((prev) => {
      const idx = prev.findIndex((x) => x.id === t.id);
      if (idx === -1) return [...prev, t];
      const copy = prev.slice();
      copy[idx] = t;
      return copy;
    });
    setEditorOpen(false);
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Destinatarios Telegram"
        description="Personas o grupos que reciben los recordatorios."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={openNew}>
              <Plus size={14} /> Nuevo destinatario
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
            <p>
              Telegram no permite enviar por número de teléfono. Cada persona
              debe iniciar el bot{" "}
              <a
                href="https://t.me/nurirecordatoriosbot"
                target="_blank"
                rel="noreferrer noopener"
                className="underline"
              >
                @nurirecordatoriosbot
              </a>{" "}
              y obtener su <code>chat_id</code>.
            </p>
            <p>
              Para recordatorios de equipo, crea un grupo de Telegram, añade el
              bot y usa el <code>chat_id</code> del grupo (suele ser negativo).
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : targets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin destinatarios. Crea el primero.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border bg-white">
              {targets.map((t) => (
                <li key={t.id} className="flex items-start gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{t.name}</span>
                      <Badge tone={t.type === "team" ? "info" : "muted"}>
                        {t.type === "team" ? "Equipo" : "Individual"}
                      </Badge>
                      {t.is_default ? (
                        <Badge tone="success">Por defecto</Badge>
                      ) : null}
                      {!t.is_active ? <Badge tone="warning">Inactivo</Badge> : null}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      chat_id: <code>{t.telegram_chat_id}</code>
                      {t.notes ? <span> · {t.notes}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMarkDefault(t)}
                      disabled={t.is_default}
                      title="Marcar por defecto"
                      aria-label="Marcar por defecto"
                      className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Star size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleActive(t)}
                      title={t.is_active ? "Desactivar" : "Activar"}
                      aria-label={t.is_active ? "Desactivar" : "Activar"}
                      className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                    >
                      {t.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      title="Editar"
                      aria-label="Editar"
                      className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                    {confirmDel === t.id ? (
                      <div className="flex items-center gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => onDelete(t)}
                          className="h-8 px-2 rounded bg-destructive text-destructive-foreground"
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDel(null)}
                          className="h-8 px-2 rounded border border-border"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDel(t.id)}
                        title="Eliminar"
                        aria-label="Eliminar"
                        className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-rose-50 text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <TargetEditor
        open={editorOpen}
        target={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={onSaved}
      />
    </>
  );
}

function TargetEditor({
  open,
  target,
  onClose,
  onSaved,
}: {
  open: boolean;
  target: NotificationTarget | null;
  onClose: () => void;
  onSaved: (t: NotificationTarget) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<NotificationTargetType>("individual");
  const [chatId, setChatId] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(target?.name ?? "");
    setType(target?.type ?? "individual");
    setChatId(target?.telegram_chat_id ?? "");
    setNotes(target?.notes ?? "");
    setIsActive(target?.is_active ?? true);
  }, [open, target]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (!chatId.trim()) {
      toast.error("El chat_id es obligatorio");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        telegram_chat_id: chatId.trim(),
        notes: notes.trim() || null,
        is_active: isActive,
      };
      const saved = target
        ? await updateTarget(target.id, payload)
        : await createTarget(payload);
      toast.success(target ? "Destinatario actualizado" : "Destinatario creado");
      onSaved(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={target ? "Editar destinatario" : "Nuevo destinatario"}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="target-editor" loading={submitting}>
            {target ? "Guardar cambios" : "Crear destinatario"}
          </Button>
        </>
      }
    >
      <form id="target-editor" onSubmit={onSubmit} className="space-y-3">
        <Field label="Nombre" htmlFor="tg-name">
          <Input
            id="tg-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder="Ej. Armando, Equipo Nuray"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Tipo" htmlFor="tg-type">
            <Select
              id="tg-type"
              value={type}
              onChange={(e) => setType(e.target.value as NotificationTargetType)}
            >
              {NOTIFICATION_TARGET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Telegram chat_id"
            htmlFor="tg-chat"
            hint="Número que aparece en api.telegram.org/bot.../getUpdates"
          >
            <Input
              id="tg-chat"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              required
              inputMode="numeric"
              placeholder="123456789 o -100123... para grupos"
            />
          </Field>
        </div>
        <Field label="Notas" htmlFor="tg-notes">
          <Textarea
            id="tg-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opcional"
          />
        </Field>
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Activo
        </label>
      </form>
    </Modal>
  );
}
