"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { listTasks, createTask } from "@/lib/repositories/tasks";
import { listClients } from "@/lib/repositories/clients";
import { listProjects } from "@/lib/repositories/projects";
import type { Client, Project, Task, TaskStatus } from "@/types/database";
import { TASK_STATUSES, PRIORITIES, TEAM_MEMBERS } from "@/types/app";

type View = "list" | "kanban";

export default function TasksPage() {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const [quickTitle, setQuickTitle] = useState("");
  const [quickBusy, setQuickBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [t, c, p] = await Promise.all([listTasks(), listClients(), listProjects()]);
      setTasks(t);
      setClients(c);
      setProjects(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function refresh() {
      load();
    }
    window.addEventListener("nuray:quick-add:created", refresh);
    return () => window.removeEventListener("nuray:quick-add:created", refresh);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (clientFilter !== "all" && t.client_id !== clientFilter) return false;
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "unassigned" && t.assignee) return false;
        if (assigneeFilter !== "unassigned" && t.assignee !== assigneeFilter) return false;
      }
      if (q) {
        const blob = `${t.title} ${t.description ?? ""} ${t.tags?.join(" ") ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter, clientFilter, assigneeFilter]);

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      pending: [],
      in_progress: [],
      blocked: [],
      done: [],
    };
    filtered.forEach((t) => map[t.status].push(t));
    return map;
  }, [filtered]);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(t: Task) {
    setEditing(t);
    setEditorOpen(true);
  }

  function onSaved(saved: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((x) => x.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const copy = prev.slice();
      copy[idx] = saved;
      return copy;
    });
    setEditorOpen(false);
  }

  function onDeleted(id: string) {
    setTasks((prev) => prev.filter((x) => x.id !== id));
    setEditorOpen(false);
  }

  function onChanged(t: Task) {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
  }

  async function onQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim() || quickBusy) return;
    setQuickBusy(true);
    try {
      const created = await createTask({ title: quickTitle });
      setTasks((prev) => [created, ...prev]);
      setQuickTitle("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setQuickBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Tareas"
        description="Organiza qué hacer y en qué estado está cada cosa."
        actions={
          <>
            <div className="hidden sm:inline-flex rounded-md border border-border bg-white p-0.5">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`px-3 h-8 text-xs rounded ${
                  view === "list" ? "bg-muted font-medium" : "text-muted-foreground"
                }`}
              >
                Lista
              </button>
              <button
                type="button"
                onClick={() => setView("kanban")}
                className={`px-3 h-8 text-xs rounded ${
                  view === "kanban" ? "bg-muted font-medium" : "text-muted-foreground"
                }`}
              >
                Kanban
              </button>
            </div>
            <Button onClick={openNew}>
              <Plus size={14} />
              Nueva tarea
            </Button>
          </>
        }
      />

      <form onSubmit={onQuickAdd} className="mb-3 flex items-center gap-2">
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Añade rápido una tarea y pulsa Enter"
          className="h-10"
          maxLength={200}
        />
        <Button type="submit" loading={quickBusy} disabled={!quickTitle.trim()}>
          Añadir
        </Button>
      </form>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-4">
        <div className="relative col-span-2 lg:col-span-2">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          {TASK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="all">Toda prioridad</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
          <option value="all">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="all">Todos los responsables</option>
          <option value="unassigned">Sin asignar</option>
          {TEAM_MEMBERS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
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
          title="Sin tareas"
          description="Crea tu primera tarea para empezar."
          action={
            <Button onClick={openNew}>
              <Plus size={14} /> Nueva tarea
            </Button>
          }
        />
      ) : view === "list" ? (
        <div className="rounded-lg border border-border overflow-hidden bg-white">
          {filtered.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              clients={clients}
              projects={projects}
              onChanged={onChanged}
              onClick={() => openEdit(t)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {TASK_STATUSES.map((col) => (
            <div
              key={col.value}
              className="bg-muted/40 rounded-lg border border-border p-2"
            >
              <div className="flex items-center justify-between px-1 pb-2 text-xs font-medium text-muted-foreground">
                <span>{col.label}</span>
                <span>{grouped[col.value].length}</span>
              </div>
              <div className="space-y-2">
                {grouped[col.value].length === 0 ? (
                  <div className="text-[11px] text-muted-foreground px-1 py-2">Vacío</div>
                ) : (
                  grouped[col.value].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openEdit(t)}
                      className="w-full text-left rounded-md border border-border bg-white p-2.5 hover:bg-muted/40"
                    >
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                        {t.due_date ? (
                          <span>{new Date(t.due_date).toLocaleDateString("es")}</span>
                        ) : null}
                        <span>· {PRIORITIES.find((p) => p.value === t.priority)?.label}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskEditor
        open={editorOpen}
        task={editing}
        clients={clients}
        projects={projects}
        onClose={() => setEditorOpen(false)}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    </>
  );
}
