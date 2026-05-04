"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { EVENT_TYPES } from "@/types/app";
import type {
  CalendarEvent,
  CalendarEventType,
  Client,
  Project,
} from "@/types/database";
import {
  createEvent,
  deleteEvent,
  updateEvent,
} from "@/lib/repositories/events";
import { fromInputDateTime, toInputDateTime } from "@/lib/utils/dates";

export function EventEditor({
  open,
  event,
  initialDate,
  clients,
  projects,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  event: CalendarEvent | null;
  initialDate?: Date;
  clients: Client[];
  projects: Project[];
  onClose: () => void;
  onSaved: (e: CalendarEvent) => void;
  onDeleted?: (id: string) => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CalendarEventType>("work");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setType(event?.type ?? "work");
    setStartAt(toInputDateTime(event?.start_at ?? initialDate ?? new Date()));
    setEndAt(toInputDateTime(event?.end_at));
    setAllDay(event?.all_day ?? false);
    setClientId(event?.client_id ?? "");
    setProjectId(event?.project_id ?? "");
    setLocation(event?.location ?? "");
    setConfirmDelete(false);
  }, [open, event, initialDate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    const startISO = fromInputDateTime(startAt);
    if (!startISO) {
      toast.error("Indica una fecha de inicio válida");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title,
        description: description.trim() || null,
        type,
        start_at: startISO,
        end_at: endAt ? fromInputDateTime(endAt) : null,
        all_day: allDay,
        client_id: clientId || null,
        project_id: projectId || null,
        location: location.trim() || null,
      };
      const saved = event
        ? await updateEvent(event.id, payload)
        : await createEvent(payload);
      toast.success(event ? "Evento actualizado" : "Evento creado");
      onSaved(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!event || submitting) return;
    setSubmitting(true);
    try {
      await deleteEvent(event.id);
      toast.success("Evento eliminado");
      onDeleted?.(event.id);
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
      title={event ? "Editar evento" : "Nuevo evento"}
      size="md"
      footer={
        <div className="flex w-full items-center justify-between">
          {event ? (
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
            <Button type="submit" form="event-editor" loading={submitting}>
              {event ? "Guardar cambios" : "Crear evento"}
            </Button>
          </div>
        </div>
      }
    >
      <form id="event-editor" onSubmit={onSubmit} className="space-y-3">
        <Field label="Título" htmlFor="e-title">
          <Input
            id="e-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            maxLength={200}
          />
        </Field>
        <Field label="Descripción" htmlFor="e-desc">
          <Textarea
            id="e-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Tipo" htmlFor="e-type">
            <Select
              id="e-type"
              value={type}
              onChange={(e) => setType(e.target.value as CalendarEventType)}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ubicación" htmlFor="e-loc">
            <Input
              id="e-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Online / dirección"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Inicio" htmlFor="e-start">
            <Input
              id="e-start"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </Field>
          <Field label="Fin" htmlFor="e-end">
            <Input
              id="e-end"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </Field>
        </div>
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Todo el día
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Cliente" htmlFor="e-client">
            <Select
              id="e-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">— Ninguno —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Proyecto" htmlFor="e-project">
            <Select
              id="e-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">— Ninguno —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
