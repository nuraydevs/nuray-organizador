"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, User } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Spinner";
import { Badge, priorityTone, projectStatusTone } from "@/components/ui/Badge";
import { ProjectEditor } from "@/components/projects/ProjectEditor";
import { listProjects } from "@/lib/repositories/projects";
import { listTasks } from "@/lib/repositories/tasks";
import { listClients } from "@/lib/repositories/clients";
import type { Client, Project, Task } from "@/types/database";
import { PRIORITIES, PROJECT_STATUSES, teamMemberLabel } from "@/types/app";
import { formatDate } from "@/lib/utils/dates";

type DueFilter = "all" | "overdue" | "soon" | "none";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");

  const [editorOpen, setEditorOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, t, c] = await Promise.all([
        listProjects(),
        listTasks(),
        listClients(),
      ]);
      setProjects(p);
      setTasks(t);
      setClients(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clientName = useCallback(
    (id: string | null) => (id ? clients.find((c) => c.id === id)?.name ?? null : null),
    [clients],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 7);
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (priorityFilter !== "all" && p.priority !== priorityFilter) return false;
      if (clientFilter !== "all" && p.client_id !== clientFilter) return false;
      if (dueFilter !== "all") {
        const due = p.due_date ? new Date(p.due_date) : null;
        if (dueFilter === "none" && due) return false;
        if (dueFilter === "overdue" && !(due && due < now)) return false;
        if (dueFilter === "soon" && !(due && due >= now && due <= soon)) return false;
      }
      if (q) {
        const blob = `${p.name} ${p.description ?? ""} ${clientName(p.client_id) ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [projects, search, statusFilter, priorityFilter, clientFilter, dueFilter, clientName]);

  function onSaved(p: Project) {
    setProjects((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx === -1) return [p, ...prev];
      const copy = prev.slice();
      copy[idx] = p;
      return copy;
    });
    setEditorOpen(false);
  }

  function progressFor(projectId: string) {
    const ts = tasks.filter((t) => t.project_id === projectId);
    if (ts.length === 0) return { total: 0, done: 0, pct: 0 };
    const done = ts.filter((t) => t.status === "done").length;
    return { total: ts.length, done, pct: Math.round((done / ts.length) * 100) };
  }

  return (
    <>
      <PageHeader
        title="Proyectos"
        description="Trabajos de Nuray: estado, responsable, vencimiento y avance."
        actions={
          <Button onClick={() => setEditorOpen(true)}>
            <Plus size={14} /> Nuevo proyecto
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
        <div className="relative col-span-2">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proyecto..."
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          {PROJECT_STATUSES.map((s) => (
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
        <Select
          value={dueFilter}
          onChange={(e) => setDueFilter(e.target.value as DueFilter)}
          className="col-span-2 lg:col-span-1"
        >
          <option value="all">Cualquier vencimiento</option>
          <option value="overdue">Vencidos</option>
          <option value="soon">Vencen en 7 días</option>
          <option value="none">Sin fecha</option>
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
          title={projects.length === 0 ? "Sin proyectos" : "Sin resultados"}
          description={
            projects.length === 0
              ? "Crea tu primer proyecto para empezar."
              : "Prueba a ajustar los filtros."
          }
          action={
            projects.length === 0 ? (
              <Button onClick={() => setEditorOpen(true)}>
                <Plus size={14} /> Nuevo proyecto
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const prog = progressFor(p.id);
            const cname = clientName(p.client_id);
            const overdue =
              p.due_date != null &&
              p.status !== "completed" &&
              p.status !== "cancelled" &&
              new Date(p.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="text-left bg-white border border-border rounded-lg p-4 hover:bg-muted/30 block"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    {cname ? (
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {cname}
                      </div>
                    ) : null}
                  </div>
                  <Badge tone={priorityTone(p.priority)}>
                    {PRIORITIES.find((x) => x.value === p.priority)?.label}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone={projectStatusTone(p.status)}>
                    {PROJECT_STATUSES.find((s) => s.value === p.status)?.label}
                  </Badge>
                  {p.owner ? (
                    <Badge tone="muted">
                      <User size={11} /> {teamMemberLabel(p.owner)}
                    </Badge>
                  ) : null}
                  {p.due_date ? (
                    <Badge tone={overdue ? "danger" : "muted"}>
                      {overdue ? "Vencido · " : ""}
                      {formatDate(p.due_date)}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>Progreso</span>
                    <span>
                      {prog.done}/{prog.total} ({prog.pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-foreground"
                      style={{ width: `${prog.pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <ProjectEditor
        open={editorOpen}
        project={null}
        clients={clients}
        onClose={() => setEditorOpen(false)}
        onSaved={onSaved}
      />
    </>
  );
}
