"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isToday, isAfter, isBefore, addDays } from "date-fns";
import {
  Plus,
  ListChecks,
  Calendar as CalendarIcon,
  Users,
  FolderKanban,
  Bell,
  AlertTriangle,
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
import type {
  CalendarEvent,
  Client,
  Project,
  Reminder,
  Task,
} from "@/types/database";
import { smartDateLabel } from "@/lib/utils/dates";

export default function DashboardPage() {
  const quickAdd = useQuickAdd();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [t, e, c, p, r] = await Promise.all([
        listTasks(),
        listEvents(),
        listClients(),
        listProjects(),
        listReminders(),
      ]);
      setTasks(t);
      setEvents(e);
      setClients(c);
      setProjects(p);
      setReminders(r);
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

  const tasksToday = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status !== "done" &&
          t.due_date &&
          isToday(new Date(t.due_date)),
      ),
    [tasks],
  );
  const tasksUrgent = useMemo(
    () =>
      tasks.filter(
        (t) => t.status !== "done" && (t.priority === "urgent" || t.priority === "high"),
      ),
    [tasks],
  );
  const tasksBlocked = useMemo(
    () => tasks.filter((t) => t.status === "blocked"),
    [tasks],
  );
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const in7d = addDays(now, 7);
    return events
      .filter((e) => {
        const start = new Date(e.start_at);
        return isAfter(start, now) && isBefore(start, in7d);
      })
      .slice(0, 6);
  }, [events]);
  const upcomingReminders = useMemo(() => {
    const now = new Date();
    return reminders
      .filter((r) => r.status === "scheduled" && isAfter(new Date(r.remind_at), now))
      .slice(0, 6);
  }, [reminders]);
  const activeClients = useMemo(
    () =>
      clients.filter((c) =>
        ["active", "meeting_scheduled", "proposal_sent", "contacted"].includes(c.status),
      ),
    [clients],
  );
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "active"),
    [projects],
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
        description="Resumen rápido de hoy y de esta semana."
        actions={
          <Button onClick={() => quickAdd.open()}>
            <Plus size={14} />
            Añadir rápido
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
        <Stat icon={<ListChecks size={14} />} label="Hoy" value={tasksToday.length} />
        <Stat
          icon={<AlertTriangle size={14} />}
          label="Urgentes"
          value={tasksUrgent.length}
        />
        <Stat icon={<ListChecks size={14} />} label="Bloqueadas" value={tasksBlocked.length} />
        <Stat icon={<CalendarIcon size={14} />} label="Eventos 7d" value={upcomingEvents.length} />
        <Stat icon={<Users size={14} />} label="Clientes activos" value={activeClients.length} />
        <Stat
          icon={<FolderKanban size={14} />}
          label="Proyectos activos"
          value={activeProjects.length}
        />
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
                <AlertTriangle size={14} /> Tareas urgentes
              </span>
              <Link href="/tasks" className="text-xs text-muted-foreground hover:underline">
                Ver todas
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksUrgent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin tareas urgentes.</p>
            ) : (
              <ul className="divide-y divide-border">
                {tasksUrgent.slice(0, 6).map((t) => (
                  <li key={t.id} className="py-2 flex items-center gap-2">
                    <span className="text-sm flex-1 truncate">{t.title}</span>
                    {t.due_date ? (
                      <span className="text-[11px] text-muted-foreground">
                        {smartDateLabel(t.due_date)}
                      </span>
                    ) : null}
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
              <Link
                href="/reminders"
                className="text-xs text-muted-foreground hover:underline"
              >
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
      </div>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white border border-border rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
