"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isToday, isAfter, isBefore, addDays } from "date-fns";
import {
  Plus,
  ListChecks,
  Calendar as CalendarIcon,
  FolderKanban,
  Bell,
  AlertTriangle,
  Inbox as InboxIcon,
  Wallet,
  Users,
  UserX,
  CircleSlash,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, priorityTone } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useQuickAdd } from "@/components/quick-add/QuickAddProvider";
import { listTasks } from "@/lib/repositories/tasks";
import { listEvents } from "@/lib/repositories/events";
import { listClients } from "@/lib/repositories/clients";
import { listProjects } from "@/lib/repositories/projects";
import { listReminders } from "@/lib/repositories/reminders";
import { listQuickCaptures } from "@/lib/repositories/quickCaptures";
import { listTransactions } from "@/lib/repositories/finance";
import type {
  CalendarEvent,
  Client,
  FinanceTransaction,
  Project,
  QuickCapture,
  Reminder,
  Task,
} from "@/types/database";
import { TEAM_MEMBERS } from "@/types/app";
import { smartDateLabel } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { summarize, inMonth } from "@/lib/finance/summary";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function DashboardPage() {
  const quickAdd = useQuickAdd();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [captures, setCaptures] = useState<QuickCapture[]>([]);
  const [txs, setTxs] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [t, e, c, p, r, q, f] = await Promise.all([
        listTasks(),
        listEvents(),
        listClients(),
        listProjects(),
        listReminders(),
        listQuickCaptures(),
        listTransactions(),
      ]);
      setTasks(t);
      setEvents(e);
      setClients(c);
      setProjects(p);
      setReminders(r);
      setCaptures(q);
      setTxs(f);
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
    function onCreated() {
      load();
    }
    window.addEventListener("nuray:quick-add:created", onCreated);
    return () => window.removeEventListener("nuray:quick-add:created", onCreated);
  }, [load]);

  // ---- Operativa --------------------------------------------------
  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);
  const overdueTasks = useMemo(() => {
    const today = startOfToday();
    return openTasks.filter((t) => t.due_date && new Date(t.due_date) < today);
  }, [openTasks]);
  const unassignedTasks = useMemo(
    () => openTasks.filter((t) => !t.assignee),
    [openTasks],
  );
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "active"),
    [projects],
  );
  const projectsDueSoon = useMemo(() => {
    const today = startOfToday();
    const soon = addDays(today, 7);
    return projects.filter(
      (p) =>
        p.status !== "completed" &&
        p.status !== "cancelled" &&
        p.due_date != null &&
        new Date(p.due_date) <= soon,
    );
  }, [projects]);
  const activeProjectsWithoutTasks = useMemo(() => {
    const withTasks = new Set(tasks.map((t) => t.project_id).filter(Boolean));
    return activeProjects.filter((p) => !withTasks.has(p.id));
  }, [activeProjects, tasks]);

  // ---- Equipo -----------------------------------------------------
  const teamLoad = useMemo(() => {
    const today = startOfToday();
    return TEAM_MEMBERS.map((m) => {
      const pending = openTasks.filter((t) => t.assignee === m.value);
      const overdue = pending.filter(
        (t) => t.due_date && new Date(t.due_date) < today,
      );
      return { ...m, pending: pending.length, overdue: overdue.length };
    });
  }, [openTasks]);

  // ---- Finanzas del mes ------------------------------------------
  const monthSummary = useMemo(() => {
    const now = new Date();
    return summarize(
      txs.filter((t) => inMonth(t.transaction_date, now.getFullYear(), now.getMonth())),
    );
  }, [txs]);
  const outstanding = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of txs) {
      if (tx.status !== "pending") continue;
      if (tx.type === "income") income += Number(tx.amount) || 0;
      else expense += Number(tx.amount) || 0;
    }
    return { income, expense };
  }, [txs]);
  const pendingIncomeCount = useMemo(
    () => txs.filter((t) => t.type === "income" && t.status === "pending").length,
    [txs],
  );

  // ---- Alertas ----------------------------------------------------
  const alerts = useMemo(() => {
    const out: { key: string; label: string; href: string; tone: "danger" | "warning" }[] = [];
    if (overdueTasks.length)
      out.push({
        key: "overdue",
        label: `${overdueTasks.length} ${overdueTasks.length === 1 ? "tarea vencida" : "tareas vencidas"}`,
        href: "/tasks",
        tone: "danger",
      });
    if (unassignedTasks.length)
      out.push({
        key: "unassigned",
        label: `${unassignedTasks.length} ${unassignedTasks.length === 1 ? "tarea sin responsable" : "tareas sin responsable"}`,
        href: "/tasks",
        tone: "warning",
      });
    if (pendingIncomeCount)
      out.push({
        key: "income",
        label: `${pendingIncomeCount} ${pendingIncomeCount === 1 ? "ingreso pendiente de cobro" : "ingresos pendientes de cobro"}`,
        href: "/finance",
        tone: "warning",
      });
    if (activeProjectsWithoutTasks.length)
      out.push({
        key: "no-tasks",
        label: `${activeProjectsWithoutTasks.length} ${activeProjectsWithoutTasks.length === 1 ? "proyecto activo sin tareas" : "proyectos activos sin tareas"}`,
        href: "/projects",
        tone: "warning",
      });
    return out;
  }, [overdueTasks, unassignedTasks, pendingIncomeCount, activeProjectsWithoutTasks]);

  // ---- Listas operativas -----------------------------------------
  const tasksToday = useMemo(
    () => openTasks.filter((t) => t.due_date && isToday(new Date(t.due_date))),
    [openTasks],
  );
  const upcomingEvents = useMemo(() => {
    const nowD = new Date();
    const in7d = addDays(nowD, 7);
    return events
      .filter((e) => {
        const start = new Date(e.start_at);
        return isAfter(start, nowD) && isBefore(start, in7d);
      })
      .slice(0, 6);
  }, [events]);
  const upcomingReminders = useMemo(() => {
    const nowD = new Date();
    return reminders
      .filter((r) => r.status === "scheduled" && isAfter(new Date(r.remind_at), nowD))
      .slice(0, 5);
  }, [reminders]);
  const pendingCaptures = useMemo(
    () => captures.filter((c) => c.status === "pending"),
    [captures],
  );

  if (loading) return <PageLoader />;
  if (error) {
    return (
      <EmptyState
        title="Error al cargar"
        description={error}
        action={<Button onClick={load}>Reintentar</Button>}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Cómo va Nuray ahora mismo: operativa, equipo y finanzas."
        actions={
          <Button onClick={() => quickAdd.open()}>
            <Plus size={14} /> Añadir rápido
          </Button>
        }
      />

      {alerts.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {alerts.map((a) => (
            <Link
              key={a.key}
              href={a.href}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                a.tone === "danger"
                  ? "bg-rose-50 text-rose-700 border-rose-100"
                  : "bg-amber-50 text-amber-700 border-amber-100"
              }`}
            >
              <AlertTriangle size={13} />
              {a.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
        <Stat icon={<FolderKanban size={14} />} label="Proyectos activos" value={activeProjects.length} />
        <Stat icon={<CalendarIcon size={14} />} label="Proyectos próximos" value={projectsDueSoon.length} />
        <Stat icon={<ListChecks size={14} />} label="Tareas pendientes" value={openTasks.length} />
        <Stat icon={<AlertTriangle size={14} />} label="Tareas vencidas" value={overdueTasks.length} tone={overdueTasks.length ? "neg" : undefined} />
        <Stat icon={<UserX size={14} />} label="Sin asignar" value={unassignedTasks.length} />
        <Stat icon={<Wallet size={14} />} label="Neto del mes" value={formatMoney(monthSummary.net)} tone={monthSummary.net >= 0 ? "pos" : "neg"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={14} /> Carga del equipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {teamLoad.map((m) => (
                <li key={m.value} className="py-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{m.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge tone="muted">{m.pending} pendientes</Badge>
                    {m.overdue > 0 ? <Badge tone="danger">{m.overdue} vencidas</Badge> : null}
                  </div>
                </li>
              ))}
            </ul>
            {openTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">
                No hay tareas pendientes en el equipo.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wallet size={14} /> Finanzas del mes
              </span>
              <Link href="/finance" className="text-xs text-muted-foreground hover:underline">
                Ver finanzas
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <MoneyLine label="Ingresos confirmados" value={formatMoney(monthSummary.incomeConfirmed)} />
              <MoneyLine label="Gastos confirmados" value={formatMoney(monthSummary.expenseConfirmed)} />
              <MoneyLine
                label="Resultado neto"
                value={formatMoney(monthSummary.net)}
                tone={monthSummary.net >= 0 ? "pos" : "neg"}
              />
              <MoneyLine label="Pendiente de cobro" value={formatMoney(outstanding.income)} />
              <MoneyLine label="Pendiente de pago" value={formatMoney(outstanding.expense)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ListChecks size={14} /> Tareas para hoy
              </span>
              <Link href="/tasks" className="text-xs text-muted-foreground hover:underline">
                Ver todas
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin tareas pendientes hoy.</p>
            ) : (
              <ul className="divide-y divide-border">
                {tasksToday.map((t) => (
                  <li key={t.id} className="py-2 flex items-center gap-2">
                    <span className="text-sm flex-1 truncate">{t.title}</span>
                    <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle size={14} /> Tareas vencidas
              </span>
              <Link href="/tasks" className="text-xs text-muted-foreground hover:underline">
                Ver todas
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada vencido. Buen trabajo.</p>
            ) : (
              <ul className="divide-y divide-border">
                {overdueTasks.slice(0, 6).map((t) => (
                  <li key={t.id} className="py-2 flex items-center gap-2">
                    <span className="text-sm flex-1 truncate">{t.title}</span>
                    {t.due_date ? (
                      <span className="text-[11px] text-rose-600">
                        {smartDateLabel(t.due_date)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <InboxIcon size={14} /> Inbox
              </span>
              <Link href="/inbox" className="text-xs text-muted-foreground hover:underline">
                Ver inbox ({pendingCaptures.length})
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingCaptures.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin capturas pendientes.</p>
            ) : (
              <ul className="space-y-2">
                {pendingCaptures.slice(0, 4).map((c) => (
                  <li key={c.id} className="text-sm truncate">
                    {c.type === "text" ? c.content || "(sin texto)" : "Nota de voz"}
                    <span className="text-[11px] text-muted-foreground">
                      {" · "}
                      {smartDateLabel(c.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarIcon size={14} /> Próximos eventos
              </span>
              <Link href="/calendar" className="text-xs text-muted-foreground hover:underline">
                Ver agenda
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin eventos próximos.</p>
            ) : (
              <ul className="divide-y divide-border">
                {upcomingEvents.map((e) => (
                  <li key={e.id} className="py-2">
                    <div className="text-sm">{e.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {smartDateLabel(e.start_at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell size={14} /> Próximos recordatorios
              </span>
              <Link href="/reminders" className="text-xs text-muted-foreground hover:underline">
                Ver todos
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingReminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay recordatorios programados.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {upcomingReminders.map((r) => (
                  <li key={r.id} className="py-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{r.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {smartDateLabel(r.remind_at)}
                      </div>
                    </div>
                    <Badge tone={r.channel === "telegram" ? "info" : "muted"}>
                      {r.channel}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleSlash size={14} /> Proyectos activos sin tareas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeProjectsWithoutTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todos los proyectos activos tienen tareas.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {activeProjectsWithoutTasks.slice(0, 6).map((p) => (
                  <li key={p.id} className="py-2">
                    <Link href={`/projects/${p.id}`} className="text-sm hover:underline">
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="bg-white border border-border rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={`mt-1 text-lg font-semibold tabular-nums ${
          tone === "pos" ? "text-emerald-700" : tone === "neg" ? "text-rose-700" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function MoneyLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={`text-sm font-medium tabular-nums ${
          tone === "pos" ? "text-emerald-700" : tone === "neg" ? "text-rose-700" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
