"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  addDays,
  subMonths,
  isToday as isTodayFn,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { EventEditor } from "@/components/calendar/EventEditor";
import { listEvents } from "@/lib/repositories/events";
import { listTasks } from "@/lib/repositories/tasks";
import { listReminders } from "@/lib/repositories/reminders";
import { listClients } from "@/lib/repositories/clients";
import { listProjects } from "@/lib/repositories/projects";
import type {
  CalendarEvent,
  Client,
  Project,
  Reminder,
  Task,
} from "@/types/database";
import { cn } from "@/lib/utils/cn";
import { formatTime, smartDateLabel } from "@/lib/utils/dates";

interface DayMarker {
  date: Date;
  events: CalendarEvent[];
  tasks: Task[];
  reminders: Reminder[];
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [e, t, r, c, p] = await Promise.all([
        listEvents(),
        listTasks(),
        listReminders(),
        listClients(),
        listProjects(),
      ]);
      setEvents(e);
      setTasks(t);
      setReminders(r);
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

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthEnd = useMemo(() => endOfMonth(cursor), [cursor]);
  const gridStart = useMemo(
    () => startOfWeek(monthStart, { weekStartsOn: 1 }),
    [monthStart],
  );
  const gridEnd = useMemo(
    () => endOfWeek(monthEnd, { weekStartsOn: 1 }),
    [monthEnd],
  );

  const days = useMemo(() => {
    const arr: DayMarker[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      arr.push({ date: d, events: [], tasks: [], reminders: [] });
      d = addDays(d, 1);
    }
    events.forEach((e) => {
      const day = arr.find((x) => isSameDay(x.date, new Date(e.start_at)));
      if (day) day.events.push(e);
    });
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const day = arr.find((x) => isSameDay(x.date, new Date(t.due_date as string)));
      if (day) day.tasks.push(t);
    });
    reminders.forEach((r) => {
      const day = arr.find((x) => isSameDay(x.date, new Date(r.remind_at)));
      if (day) day.reminders.push(r);
    });
    return arr;
  }, [gridStart, gridEnd, events, tasks, reminders]);

  const selectedDay = useMemo(
    () => days.find((d) => isSameDay(d.date, selected)) ?? null,
    [days, selected],
  );

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(ev: CalendarEvent) {
    setEditing(ev);
    setEditorOpen(true);
  }
  function onSaved(ev: CalendarEvent) {
    setEvents((prev) => {
      const i = prev.findIndex((x) => x.id === ev.id);
      if (i === -1) return [...prev, ev];
      const copy = prev.slice();
      copy[i] = ev;
      return copy;
    });
    setEditorOpen(false);
  }
  function onDeleted(id: string) {
    setEvents((prev) => prev.filter((x) => x.id !== id));
    setEditorOpen(false);
  }

  const weekdays = ["L", "M", "X", "J", "V", "S", "D"];

  return (
    <>
      <PageHeader
        title="Calendario"
        description="Eventos, fechas límite y recordatorios en un solo lugar."
        actions={
          <Button onClick={openNew}>
            <Plus size={14} /> Nuevo evento
          </Button>
        }
      />

      {loading ? (
        <PageLoader />
      ) : error ? (
        <EmptyState
          title="Error al cargar"
          description={error}
          action={<Button onClick={load}>Reintentar</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="bg-white border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCursor(subMonths(cursor, 1))}
                  className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                  aria-label="Mes anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setCursor(addMonths(cursor, 1))}
                  className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                  aria-label="Mes siguiente"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCursor(now);
                    setSelected(now);
                  }}
                  className="ml-2 h-8 px-3 rounded text-xs border border-border hover:bg-muted"
                >
                  Hoy
                </button>
              </div>
              <div className="text-sm font-semibold capitalize">
                {format(cursor, "MMMM yyyy", { locale: es })}
              </div>
            </div>

            <div className="grid grid-cols-7 text-[11px] text-muted-foreground mb-1">
              {weekdays.map((w) => (
                <div key={w} className="px-2 py-1 text-center font-medium">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((d) => {
                const isCurrentMonth = isSameMonth(d.date, cursor);
                const isSel = isSameDay(d.date, selected);
                const today = isTodayFn(d.date);
                const dotCount =
                  d.events.length + d.tasks.length + d.reminders.length;
                return (
                  <button
                    key={d.date.toISOString()}
                    type="button"
                    onClick={() => setSelected(d.date)}
                    className={cn(
                      "min-h-[68px] sm:min-h-[80px] rounded-md border text-left p-1.5 flex flex-col",
                      isSel
                        ? "border-foreground/30 bg-muted"
                        : "border-border hover:bg-muted/40",
                      !isCurrentMonth && "opacity-40",
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-medium",
                        today ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {format(d.date, "d")}
                      {today ? (
                        <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-foreground align-middle" />
                      ) : null}
                    </span>
                    {dotCount > 0 ? (
                      <div className="mt-auto flex flex-wrap gap-1">
                        {d.events.slice(0, 2).map((e) => (
                          <span
                            key={e.id}
                            className="block h-1.5 w-1.5 rounded-full bg-blue-500"
                            title={e.title}
                          />
                        ))}
                        {d.tasks.length > 0 ? (
                          <span className="block h-1.5 w-1.5 rounded-full bg-amber-500" />
                        ) : null}
                        {d.reminders.length > 0 ? (
                          <span className="block h-1.5 w-1.5 rounded-full bg-rose-500" />
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-white border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold capitalize">
                  {format(selected, "EEEE d 'de' MMMM", { locale: es })}
                </div>
                <CalendarIcon size={14} className="text-muted-foreground" />
              </div>
              {selectedDay && selectedDay.events.length === 0 && selectedDay.tasks.length === 0 && selectedDay.reminders.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin eventos.</p>
              ) : (
                <ul className="space-y-1.5">
                  {selectedDay?.events.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-start gap-2 cursor-pointer hover:bg-muted/40 rounded px-2 py-1.5"
                      onClick={() => openEdit(e)}
                    >
                      <span className="block h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{e.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {e.all_day ? "Todo el día" : formatTime(e.start_at)}
                          {e.end_at ? ` - ${formatTime(e.end_at)}` : ""}
                        </div>
                      </div>
                      <Badge tone="info">{e.type}</Badge>
                    </li>
                  ))}
                  {selectedDay?.tasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start gap-2 px-2 py-1.5 rounded"
                    >
                      <span className="block h-2 w-2 rounded-full bg-amber-500 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{t.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Tarea · {smartDateLabel(t.due_date)}
                        </div>
                      </div>
                    </li>
                  ))}
                  {selectedDay?.reminders.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-start gap-2 px-2 py-1.5 rounded"
                    >
                      <span className="block h-2 w-2 rounded-full bg-rose-500 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{r.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Recordatorio · {formatTime(r.remind_at)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="outline" onClick={openNew}>
                  <Plus size={14} /> Nuevo evento
                </Button>
              </div>
            </div>

            <div className="bg-white border border-border rounded-lg p-3">
              <div className="text-sm font-semibold mb-2">Próximos eventos</div>
              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin eventos.</p>
              ) : (
                <ul className="space-y-1.5">
                  {events
                    .filter((e) => new Date(e.start_at) >= new Date())
                    .slice(0, 6)
                    .map((e) => (
                      <li
                        key={e.id}
                        className="flex items-start gap-2 cursor-pointer hover:bg-muted/40 rounded px-2 py-1.5"
                        onClick={() => openEdit(e)}
                      >
                        <span className="block h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm truncate">{e.title}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {smartDateLabel(e.start_at)}
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <EventEditor
        open={editorOpen}
        event={editing}
        initialDate={selected}
        clients={clients}
        projects={projects}
        onClose={() => setEditorOpen(false)}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    </>
  );
}
