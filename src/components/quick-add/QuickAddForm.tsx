"use client";

import { useEffect, useState } from "react";
import { ListChecks, Bell, FileText, Mic, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { PRIORITIES } from "@/types/app";
import { createTask } from "@/lib/repositories/tasks";
import { createReminder } from "@/lib/repositories/reminders";
import { listClients } from "@/lib/repositories/clients";
import { listProjects } from "@/lib/repositories/projects";
import {
  createAudioCapture,
  createTextCapture,
  uploadAudioBlob,
} from "@/lib/repositories/quickCaptures";
import type { Client, Project, Priority } from "@/types/database";
import { fromInputDateTime } from "@/lib/utils/dates";
import { AudioRecorder, AudioUploadIndicator } from "./AudioRecorder";
import { cn } from "@/lib/utils/cn";

type Mode = "text" | "audio" | "task" | "reminder";

const TABS: { value: Mode; label: string; icon: LucideIcon }[] = [
  { value: "text", label: "Texto", icon: FileText },
  { value: "audio", label: "Audio", icon: Mic },
  { value: "task", label: "Tarea", icon: ListChecks },
  { value: "reminder", label: "Aviso", icon: Bell },
];

export function QuickAddForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("text");

  // capture
  const [captureText, setCaptureText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // task / reminder shared
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [channel, setChannel] = useState<"app" | "telegram">("app");

  const [submitting, setSubmitting] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (mode !== "task" && mode !== "reminder") return;
    let alive = true;
    Promise.all([listClients(), listProjects()])
      .then(([c, p]) => {
        if (!alive) return;
        setClients(c);
        setProjects(p);
      })
      .catch(() => {
        // silent: not essential for quick add
      });
    return () => {
      alive = false;
    };
  }, [mode]);

  function notifyCreated() {
    window.dispatchEvent(new CustomEvent("nuray:quick-add:created"));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (mode === "text") {
      const trimmed = captureText.trim();
      if (!trimmed) {
        toast.error("Escribe algo antes de guardar");
        return;
      }
      setSubmitting(true);
      try {
        await createTextCapture(trimmed);
        toast.success("Captura guardada");
        notifyCreated();
        onDone();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === "audio") {
      if (!audioBlob) {
        toast.error("Graba un audio antes de guardar");
        return;
      }
      setSubmitting(true);
      try {
        const { audioUrl, audioPath } = await uploadAudioBlob(audioBlob);
        await createAudioCapture({ audioUrl, audioPath });
        toast.success("Audio guardado");
        notifyCreated();
        onDone();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar audio");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "task") {
        await createTask({
          title,
          priority,
          due_date: fromInputDateTime(dueDate),
          client_id: clientId || null,
          project_id: projectId || null,
        });
        toast.success("Tarea creada");
      } else {
        if (!dueDate) {
          toast.error("Indica fecha y hora del recordatorio");
          setSubmitting(false);
          return;
        }
        await createReminder({
          title,
          remind_at: fromInputDateTime(dueDate) ?? new Date().toISOString(),
          channel,
          related_type: "custom",
        });
        toast.success("Recordatorio creado");
      }
      notifyCreated();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(next: Mode) {
    if (submitting) return;
    setMode(next);
    // Reset transient state but keep generic text/title across modes if helpful
    setAudioBlob(null);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-muted/40 p-0.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = mode === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => changeMode(t.value)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 rounded text-[11px]",
                active
                  ? "bg-white shadow-sm font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {mode === "text" ? (
        <Field
          label="Tu idea o nota"
          htmlFor="qa-capture-text"
          required
          hint="Se guarda como captura para procesar más tarde."
        >
          <Textarea
            id="qa-capture-text"
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
            autoFocus
            placeholder="Escribe una idea, nota de reunión o pendiente rápido..."
            className="min-h-[140px]"
            maxLength={5000}
          />
        </Field>
      ) : null}

      {mode === "audio" ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Graba una nota de voz. Se guarda como captura para procesar más tarde.
          </p>
          <AudioRecorder
            onReady={(blob) => setAudioBlob(blob)}
            onReset={() => setAudioBlob(null)}
            disabled={submitting}
          />
          <AudioUploadIndicator uploading={submitting} />
        </div>
      ) : null}

      {mode === "task" || mode === "reminder" ? (
        <>
          <Field label="Título" htmlFor="qa-title" required>
            <Input
              id="qa-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder={mode === "task" ? "Ej. Llamar a Haro" : "Ej. Revisar propuesta"}
              required
              maxLength={200}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mode === "task" ? (
              <Field label="Prioridad" htmlFor="qa-prio">
                <Select
                  id="qa-prio"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label="Canal" htmlFor="qa-channel">
                <Select
                  id="qa-channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as "app" | "telegram")}
                >
                  <option value="app">App</option>
                  <option value="telegram">Telegram</option>
                </Select>
              </Field>
            )}
            <Field
              label={mode === "task" ? "Fecha límite" : "Fecha y hora"}
              htmlFor="qa-due"
              required={mode === "reminder"}
            >
              <Input
                id="qa-due"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required={mode === "reminder"}
              />
            </Field>
          </div>

          {mode === "task" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Cliente" htmlFor="qa-client">
                <Select
                  id="qa-client"
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
              <Field label="Proyecto" htmlFor="qa-project">
                <Select
                  id="qa-project"
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
          ) : null}
        </>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={submitting}
          disabled={
            (mode === "text" && !captureText.trim()) ||
            (mode === "audio" && !audioBlob)
          }
        >
          {mode === "text"
            ? "Guardar captura"
            : mode === "audio"
            ? "Guardar audio"
            : mode === "task"
            ? "Crear tarea"
            : "Crear recordatorio"}
        </Button>
      </div>
    </form>
  );
}
