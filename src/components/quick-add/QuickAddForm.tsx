"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { PRIORITIES } from "@/types/app";
import { createTask } from "@/lib/repositories/tasks";
import { createReminder } from "@/lib/repositories/reminders";
import { listClients } from "@/lib/repositories/clients";
import { listProjects } from "@/lib/repositories/projects";
import type { Client, Project, Priority } from "@/types/database";
import { fromInputDateTime } from "@/lib/utils/dates";

type Mode = "task" | "reminder";

export function QuickAddForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("task");
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
    let alive = true;
    Promise.all([listClients(), listProjects()])
      .then(([c, p]) => {
        if (!alive) return;
        setClients(c);
        setProjects(p);
      })
      .catch(() => {
        // silent: quick-add doesn't depend on this
      });
    return () => {
      alive = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
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
      // notify pages to refresh
      window.dispatchEvent(new CustomEvent("nuray:quick-add:created"));
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5">
        <button
          type="button"
          onClick={() => setMode("task")}
          className={`px-3 py-1.5 text-xs rounded ${
            mode === "task" ? "bg-white shadow-sm font-medium" : "text-muted-foreground"
          }`}
        >
          Tarea
        </button>
        <button
          type="button"
          onClick={() => setMode("reminder")}
          className={`px-3 py-1.5 text-xs rounded ${
            mode === "reminder" ? "bg-white shadow-sm font-medium" : "text-muted-foreground"
          }`}
        >
          Recordatorio
        </button>
      </div>

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
          label={mode === "task" ? "Fecha límite (opcional)" : "Fecha y hora"}
          htmlFor="qa-due"
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
          <Field label="Cliente (opcional)" htmlFor="qa-client">
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
          <Field label="Proyecto (opcional)" htmlFor="qa-project">
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

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {mode === "task" ? "Crear tarea" : "Crear recordatorio"}
        </Button>
      </div>
    </form>
  );
}
