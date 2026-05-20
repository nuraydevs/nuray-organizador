"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Plus,
  ListChecks,
  Wallet,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, priorityTone, projectStatusTone } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { ProjectEditor } from "@/components/projects/ProjectEditor";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { TaskRow } from "@/components/tasks/TaskRow";
import { FinanceEditor } from "@/components/finance/FinanceEditor";
import { getProject, listProjects } from "@/lib/repositories/projects";
import { listTasks } from "@/lib/repositories/tasks";
import { listClients } from "@/lib/repositories/clients";
import { listTransactions } from "@/lib/repositories/finance";
import type {
  Client,
  FinanceTransaction,
  Project,
  Task,
} from "@/types/database";
import {
  PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  TEAM_MEMBERS,
  teamMemberLabel,
} from "@/types/app";
import { formatDate } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { summarize } from "@/lib/finance/summary";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const id = params?.id;

  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [txs, setTxs] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [financeEditorOpen, setFinanceEditorOpen] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [p, allP, c, t, f] = await Promise.all([
        getProject(id),
        listProjects(),
        listClients(),
        listTasks(),
        listTransactions(),
      ]);
      setProject(p);
      setProjects(allP);
      setClients(c);
      setTasks(t.filter((x) => x.project_id === id));
      setTxs(f.filter((x) => x.project_id === id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const client = useMemo(
    () => clients.find((c) => c.id === project?.client_id) ?? null,
    [clients, project],
  );

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const pending = total - done;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pending, pct };
  }, [tasks]);

  const finance = useMemo(() => summarize(txs), [txs]);

  const visibleTasks = useMemo(() => {
    if (assigneeFilter === "all") return tasks;
    if (assigneeFilter === "unassigned") return tasks.filter((t) => !t.assignee);
    return tasks.filter((t) => t.assignee === assigneeFilter);
  }, [tasks, assigneeFilter]);

  function onProjectSaved(p: Project) {
    setProject(p);
    setEditorOpen(false);
    toast.success("Cambios guardados");
  }
  function onProjectDeleted() {
    setEditorOpen(false);
    router.replace("/projects");
  }
  function onTaskSaved(t: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((x) => x.id === t.id);
      if (t.project_id !== id) return prev.filter((x) => x.id !== t.id);
      if (idx === -1) return [t, ...prev];
      const copy = prev.slice();
      copy[idx] = t;
      return copy;
    });
    setTaskEditorOpen(false);
  }
  function onTaskDeleted(taskId: string) {
    setTasks((prev) => prev.filter((x) => x.id !== taskId));
    setTaskEditorOpen(false);
  }
  function onTaskChanged(t: Task) {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
  }
  function onTxSaved(tx: FinanceTransaction) {
    setTxs((prev) => {
      if (tx.project_id !== id) return prev.filter((x) => x.id !== tx.id);
      const idx = prev.findIndex((x) => x.id === tx.id);
      if (idx === -1) return [tx, ...prev];
      const copy = prev.slice();
      copy[idx] = tx;
      return copy;
    });
    setFinanceEditorOpen(false);
  }

  if (loading) return <PageLoader />;
  if (error || !project) {
    return (
      <EmptyState
        title={project ? "Error" : "Proyecto no encontrado"}
        description={error ?? "El proyecto no existe o ha sido eliminado."}
        action={
          <Link href="/projects">
            <Button variant="outline">Volver</Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-2 hover:text-foreground"
      >
        <ArrowLeft size={14} /> Proyectos
      </Link>
      <PageHeader
        title={project.name}
        description={client ? client.name : undefined}
        actions={
          <Button onClick={() => setEditorOpen(true)} variant="outline">
            <Pencil size={14} /> Editar
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
        <Stat label="Tareas" value={taskStats.total} />
        <Stat label="Completadas" value={taskStats.done} />
        <Stat label="Pendientes" value={taskStats.pending} />
        <Stat label="Avance" value={`${taskStats.pct}%`} />
        <Stat label="Ingresos" value={formatMoney(finance.incomeConfirmed)} />
        <Stat
          label="Neto"
          value={formatMoney(finance.net)}
          tone={finance.net >= 0 ? "pos" : "neg"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge tone={projectStatusTone(project.status)}>
                {PROJECT_STATUSES.find((s) => s.value === project.status)?.label}
              </Badge>
              <Badge tone={priorityTone(project.priority)}>
                {PRIORITIES.find((p) => p.value === project.priority)?.label}
              </Badge>
              <Badge tone="muted">
                {PROJECT_TYPES.find((t) => t.value === project.type)?.label}
              </Badge>
              <Badge tone="muted">Responsable: {teamMemberLabel(project.owner)}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Info
                label="Cliente"
                value={client?.name ?? null}
                href={client ? `/clients/${client.id}` : undefined}
              />
              <Info label="Inicio" value={formatDate(project.start_date)} />
              <Info label="Fecha límite" value={formatDate(project.due_date)} />
              <Info
                label="Valor estimado"
                value={
                  project.estimated_value != null
                    ? formatMoney(project.estimated_value)
                    : null
                }
              />
            </div>
            {project.description ? (
              <div className="border-t border-border pt-3">
                <div className="text-xs font-medium text-muted-foreground">
                  Descripción
                </div>
                <p className="text-sm whitespace-pre-wrap mt-0.5">
                  {project.description}
                </p>
              </div>
            ) : null}
            {project.notes ? (
              <div className="border-t border-border pt-3">
                <div className="text-xs font-medium text-muted-foreground">Notas</div>
                <p className="text-sm whitespace-pre-wrap mt-0.5">{project.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet size={14} /> Rentabilidad del proyecto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {txs.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Sin movimientos financieros vinculados.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFinanceEditorOpen(true)}
                >
                  <Plus size={14} /> Registrar movimiento
                </Button>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <MoneyRow
                  icon={<TrendingUp size={14} className="text-emerald-600" />}
                  label="Ingresos"
                  value={formatMoney(finance.incomeConfirmed)}
                />
                <MoneyRow
                  icon={<TrendingDown size={14} className="text-rose-600" />}
                  label="Gastos"
                  value={formatMoney(finance.expenseConfirmed)}
                />
                <div className="border-t border-border pt-2 flex items-center justify-between font-medium">
                  <span>Resultado neto</span>
                  <span
                    className={
                      finance.net >= 0 ? "text-emerald-700" : "text-rose-700"
                    }
                  >
                    {formatMoney(finance.net)}
                  </span>
                </div>
                {finance.incomePending > 0 ? (
                  <div className="text-[11px] text-muted-foreground">
                    Pendiente de cobro: {formatMoney(finance.incomePending)}
                  </div>
                ) : null}
                {finance.expensePending > 0 ? (
                  <div className="text-[11px] text-muted-foreground">
                    Pendiente de pago: {formatMoney(finance.expensePending)}
                  </div>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setFinanceEditorOpen(true)}
                >
                  <Plus size={14} /> Registrar movimiento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <ListChecks size={14} /> Tareas del proyecto
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="h-8 text-xs w-auto"
              >
                <option value="all">Todos</option>
                <option value="unassigned">Sin asignar</option>
                {TEAM_MEMBERS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                onClick={() => {
                  setEditingTask(null);
                  setTaskEditorOpen(true);
                }}
              >
                <Plus size={14} /> Nueva tarea
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {visibleTasks.length === 0 ? (
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  {tasks.length === 0
                    ? "Este proyecto aún no tiene tareas."
                    : "Sin tareas para este responsable."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {visibleTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    clients={clients}
                    projects={projects}
                    onChanged={onTaskChanged}
                    onClick={() => {
                      setEditingTask(t);
                      setTaskEditorOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ProjectEditor
        open={editorOpen}
        project={project}
        clients={clients}
        onClose={() => setEditorOpen(false)}
        onSaved={onProjectSaved}
        onDeleted={onProjectDeleted}
      />
      <TaskEditor
        open={taskEditorOpen}
        task={editingTask}
        clients={clients}
        projects={projects}
        defaultProjectId={project.id}
        onClose={() => setTaskEditorOpen(false)}
        onSaved={onTaskSaved}
        onDeleted={onTaskDeleted}
      />
      <FinanceEditor
        open={financeEditorOpen}
        transaction={null}
        clients={clients}
        projects={projects}
        defaultProjectId={project.id}
        defaultClientId={project.client_id ?? ""}
        onClose={() => setFinanceEditorOpen(false)}
        onSaved={onTxSaved}
      />
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="bg-white border border-border rounded-lg p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-base sm:text-lg font-semibold tabular-nums ${
          tone === "pos" ? "text-emerald-700" : tone === "neg" ? "text-rose-700" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function MoneyRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Info({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm">
        {value ? (
          href ? (
            <Link href={href} className="hover:underline">
              {value}
            </Link>
          ) : (
            value
          )
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}
