"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  TEAM_MEMBERS,
} from "@/types/app";
import type {
  Client,
  Priority,
  Project,
  ProjectStatus,
  ProjectType,
} from "@/types/database";
import {
  createProject,
  deleteProject,
  updateProject,
} from "@/lib/repositories/projects";
import { fromInputDate, toInputDate } from "@/lib/utils/dates";

export function ProjectEditor({
  open,
  project,
  clients,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  project: Project | null;
  clients: Client[];
  onClose: () => void;
  onSaved: (p: Project) => void;
  onDeleted?: (id: string) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProjectType>("internal");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [priority, setPriority] = useState<Priority>("medium");
  const [clientId, setClientId] = useState("");
  const [owner, setOwner] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    setType(project?.type ?? "internal");
    setStatus(project?.status ?? "active");
    setPriority(project?.priority ?? "medium");
    setClientId(project?.client_id ?? "");
    setOwner(project?.owner ?? "");
    setStartDate(toInputDate(project?.start_date));
    setDueDate(toInputDate(project?.due_date));
    setEstimatedValue(
      project?.estimated_value != null ? String(project.estimated_value) : "",
    );
    setNotes(project?.notes ?? "");
    setConfirmDelete(false);
  }, [open, project]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const value = estimatedValue.trim() ? Number(estimatedValue) : null;
    if (value != null && (Number.isNaN(value) || value < 0)) {
      toast.error("El valor estimado no es válido");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<Project> = {
        name,
        description: description.trim() || null,
        type,
        status,
        priority,
        client_id: clientId || null,
        owner: owner || null,
        start_date: fromInputDate(startDate),
        due_date: fromInputDate(dueDate),
        estimated_value: value,
        notes: notes.trim() || null,
      };
      const saved = project
        ? await updateProject(project.id, payload)
        : await createProject(payload);
      toast.success(project ? "Proyecto actualizado" : "Proyecto creado");
      onSaved(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!project || submitting) return;
    setSubmitting(true);
    try {
      await deleteProject(project.id);
      toast.success("Proyecto eliminado");
      onDeleted?.(project.id);
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
      title={project ? "Editar proyecto" : "Nuevo proyecto"}
      description="Solo el nombre es obligatorio. Puedes completar el resto más tarde."
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          {project ? (
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
            <Button type="submit" form="project-editor" loading={submitting}>
              {project ? "Guardar cambios" : "Crear proyecto"}
            </Button>
          </div>
        </div>
      }
    >
      <form id="project-editor" onSubmit={onSubmit} className="space-y-3">
        <Field label="Nombre" htmlFor="p-name" required>
          <Input
            id="p-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            maxLength={200}
            placeholder="Ej. Web Haro Restaurante"
          />
        </Field>
        <Field label="Descripción" htmlFor="p-desc">
          <Textarea
            id="p-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Alcance, objetivo, contexto..."
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Cliente" htmlFor="p-client">
            <Select
              id="p-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">— Sin cliente —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Responsable" htmlFor="p-owner">
            <Select id="p-owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">— Sin asignar —</option>
              {TEAM_MEMBERS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Estado" htmlFor="p-status">
            <Select
              id="p-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridad" htmlFor="p-prio">
            <Select
              id="p-prio"
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
          <Field label="Tipo" htmlFor="p-type">
            <Select
              id="p-type"
              value={type}
              onChange={(e) => setType(e.target.value as ProjectType)}
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Inicio" htmlFor="p-start">
            <Input
              id="p-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="Fecha límite" htmlFor="p-due">
            <Input
              id="p-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
          <Field label="Valor estimado (€)" htmlFor="p-value">
            <Input
              id="p-value"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>

        <Field label="Notas" htmlFor="p-notes">
          <Textarea
            id="p-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
