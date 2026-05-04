"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { PRIORITIES, TASK_STATUSES } from "@/types/app";
import type {
  Client,
  Priority,
  Project,
  Task,
  TaskChecklistItem,
  TaskStatus,
} from "@/types/database";
import {
  addChecklistItem,
  createTask,
  deleteChecklistItem,
  deleteTask,
  listChecklist,
  updateChecklistItem,
  updateTask,
} from "@/lib/repositories/tasks";
import { fromInputDateTime, toInputDateTime } from "@/lib/utils/dates";

export function TaskEditor({
  open,
  task,
  clients,
  projects,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  task: Task | null;
  clients: Client[];
  projects: Project[];
  onClose: () => void;
  onSaved: (task: Task) => void;
  onDeleted?: (id: string) => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [items, setItems] = useState<TaskChecklistItem[]>([]);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [itemBusy, setItemBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setStatus(task?.status ?? "pending");
    setPriority(task?.priority ?? "medium");
    setDueDate(toInputDateTime(task?.due_date));
    setClientId(task?.client_id ?? "");
    setProjectId(task?.project_id ?? "");
    setConfirmDelete(false);
    if (task?.id) {
      listChecklist(task.id)
        .then(setItems)
        .catch(() => setItems([]));
    } else {
      setItems([]);
    }
  }, [open, task]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<Task> = {
        title,
        description: description.trim() || null,
        status,
        priority,
        due_date: fromInputDateTime(dueDate),
        client_id: clientId || null,
        project_id: projectId || null,
      };
      const saved = task
        ? await updateTask(task.id, payload)
        : await createTask(payload);
      toast.success(task ? "Tarea actualizada" : "Tarea creada");
      onSaved(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!task || submitting) return;
    setSubmitting(true);
    try {
      await deleteTask(task.id);
      toast.success("Tarea eliminada");
      onDeleted?.(task.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setSubmitting(false);
    }
  }

  async function onAddItem() {
    if (!task || !newItemTitle.trim() || itemBusy) return;
    setItemBusy(true);
    try {
      const item = await addChecklistItem(task.id, newItemTitle, items.length);
      setItems((prev) => [...prev, item]);
      setNewItemTitle("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo añadir");
    } finally {
      setItemBusy(false);
    }
  }

  async function onToggleItem(item: TaskChecklistItem) {
    try {
      const updated = await updateChecklistItem(item.id, { is_done: !item.is_done });
      setItems((prev) => prev.map((x) => (x.id === item.id ? updated : x)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function onRemoveItem(item: TaskChecklistItem) {
    try {
      await deleteChecklistItem(item.id);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "Editar tarea" : "Nueva tarea"}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {task ? (
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
            <Button type="submit" form="task-editor" loading={submitting}>
              {task ? "Guardar cambios" : "Crear tarea"}
            </Button>
          </div>
        </div>
      }
    >
      <form id="task-editor" onSubmit={onSubmit} className="space-y-4">
        <Field label="Título" htmlFor="t-title">
          <Input
            id="t-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            maxLength={200}
            placeholder="Ej. Preparar propuesta para Haro"
          />
        </Field>

        <Field label="Descripción" htmlFor="t-desc">
          <Textarea
            id="t-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas, contexto..."
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Estado" htmlFor="t-status">
            <Select
              id="t-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridad" htmlFor="t-priority">
            <Select
              id="t-priority"
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Fecha límite" htmlFor="t-due">
            <Input
              id="t-due"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
          <Field label="Cliente" htmlFor="t-client">
            <Select
              id="t-client"
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
        </div>

        <Field label="Proyecto" htmlFor="t-project">
          <Select
            id="t-project"
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

        {task ? (
          <div className="border-t border-border pt-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">Checklist</div>
            <ul className="space-y-1.5">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 group"
                >
                  <input
                    type="checkbox"
                    checked={item.is_done}
                    onChange={() => onToggleItem(item)}
                    className="h-4 w-4 rounded border-border"
                    aria-label={`Marcar ${item.title}`}
                  />
                  <span
                    className={`text-sm flex-1 ${
                      item.is_done ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {item.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item)}
                    className="opacity-50 hover:opacity-100 text-muted-foreground"
                    aria-label="Eliminar item"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 mt-2">
              <Input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Añadir item de checklist"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddItem();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={onAddItem}
                loading={itemBusy}
                size="sm"
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Podrás añadir checklist tras crear la tarea.
          </p>
        )}
      </form>
    </Modal>
  );
}
