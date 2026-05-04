"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Spinner";
import { Badge, priorityTone } from "@/components/ui/Badge";
import {
  ProjectEditor,
  PROJECT_TYPES,
  PROJECT_STATUSES,
} from "@/components/projects/ProjectEditor";
import { listProjects } from "@/lib/repositories/projects";
import { listTasks } from "@/lib/repositories/tasks";
import type { Project, Task } from "@/types/database";
import { PRIORITIES } from "@/types/app";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, t] = await Promise.all([listProjects(), listTasks()]);
      setProjects(p);
      setTasks(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q) {
        const blob = `${p.name} ${p.description ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [projects, search, typeFilter, statusFilter]);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(p: Project) {
    setEditing(p);
    setEditorOpen(true);
  }
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
  function onDeleted(id: string) {
    setProjects((prev) => prev.filter((x) => x.id !== id));
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
        description="Agencia, estudio, personal e interno."
        actions={
          <Button onClick={openNew}>
            <Plus size={14} /> Nuevo proyecto
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
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
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">Todos los tipos</option>
          {PROJECT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
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
          title="Sin proyectos"
          description="Crea tu primer proyecto para empezar."
          action={
            <Button onClick={openNew}>
              <Plus size={14} /> Nuevo proyecto
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const prog = progressFor(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => openEdit(p)}
                className="text-left bg-white border border-border rounded-lg p-4 hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    {p.description ? (
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {p.description}
                      </div>
                    ) : null}
                  </div>
                  <Badge tone={priorityTone(p.priority)}>
                    {PRIORITIES.find((x) => x.value === p.priority)?.label}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="muted">
                    {PROJECT_TYPES.find((t) => t.value === p.type)?.label}
                  </Badge>
                  <Badge tone="info">
                    {PROJECT_STATUSES.find((s) => s.value === p.status)?.label}
                  </Badge>
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
              </button>
            );
          })}
        </div>
      )}

      <ProjectEditor
        open={editorOpen}
        project={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    </>
  );
}
