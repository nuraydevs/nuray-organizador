"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Bell,
  Calendar as CalendarIcon,
  ListChecks,
  Wallet,
  FolderKanban,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, priorityTone, projectStatusTone } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { ClientEditor } from "@/components/clients/ClientEditor";
import { ImportantLinks } from "@/components/clients/ImportantLinks";
import { getClient } from "@/lib/repositories/clients";
import { listTasks } from "@/lib/repositories/tasks";
import { listEvents } from "@/lib/repositories/events";
import { listReminders } from "@/lib/repositories/reminders";
import { listProjects } from "@/lib/repositories/projects";
import { listTransactions } from "@/lib/repositories/finance";
import type {
  CalendarEvent,
  Client,
  FinanceTransaction,
  Project,
  Reminder,
  Task,
} from "@/types/database";
import { CLIENT_STATUSES, PRIORITIES, PROJECT_STATUSES } from "@/types/app";
import { smartDateLabel } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { summarize } from "@/lib/finance/summary";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const id = params?.id;
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [txs, setTxs] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [c, t, e, r, p, f] = await Promise.all([
        getClient(id),
        listTasks(),
        listEvents(),
        listReminders(),
        listProjects(),
        listTransactions(),
      ]);
      setClient(c);
      setTasks(t.filter((x) => x.client_id === id));
      setEvents(e.filter((x) => x.client_id === id));
      setReminders(
        r.filter((x) => x.related_type === "client" && x.related_id === id),
      );
      setProjects(p.filter((x) => x.client_id === id));
      setTxs(f.filter((x) => x.client_id === id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function onSaved(c: Client) {
    setClient(c);
    setEditorOpen(false);
    toast.success("Cambios guardados");
  }
  function onDeleted() {
    setEditorOpen(false);
    router.replace("/clients");
  }

  if (loading) return <PageLoader />;
  if (error || !client) {
    return (
      <EmptyState
        title={client ? "Error" : "Cliente no encontrado"}
        description={error ?? "El cliente no existe o ha sido eliminado."}
        action={
          <Link href="/clients">
            <Button variant="outline">Volver</Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-2 hover:text-foreground"
      >
        <ArrowLeft size={14} /> Clientes
      </Link>
      <PageHeader
        title={client.name}
        description={client.business_name ?? undefined}
        actions={
          <Button onClick={() => setEditorOpen(true)} variant="outline">
            <Pencil size={14} /> Editar
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge tone="info">
                {CLIENT_STATUSES.find((s) => s.value === client.status)?.label}
              </Badge>
              <Badge tone="muted">{client.project_status}</Badge>
              <Badge tone={priorityTone(client.priority)}>
                {PRIORITIES.find((p) => p.value === client.priority)?.label}
              </Badge>
              <Badge tone="muted">Pago: {client.payment_status}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Info label="Contacto" value={client.contact_name} />
              <Info label="Teléfono" value={client.phone} />
              <Info label="Email" value={client.email} />
              <Info label="Web" value={client.website} link />
              <Info
                label="Presupuesto"
                value={client.budget != null ? `${client.budget} €` : null}
              />
              <Info label="Inicio" value={client.start_date} />
            </div>
            <div className="border-t border-border pt-3">
              <div className="text-xs font-medium text-muted-foreground">
                Próxima acción
              </div>
              <div className="text-sm mt-0.5">
                {client.next_action ?? <span className="text-muted-foreground">—</span>}
              </div>
              {client.next_action_date ? (
                <div className="text-[11px] text-muted-foreground">
                  {smartDateLabel(client.next_action_date)}
                </div>
              ) : null}
            </div>
            {client.notes ? (
              <div className="border-t border-border pt-3">
                <div className="text-xs font-medium text-muted-foreground">Notas</div>
                <p className="text-sm whitespace-pre-wrap mt-0.5">{client.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enlaces importantes</CardTitle>
          </CardHeader>
          <CardContent>
            <ImportantLinks client={client} onUpdated={setClient} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet size={14} /> Resumen económico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {txs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Sin ingresos ni gastos vinculados a este cliente.
              </p>
            ) : (
              (() => {
                const s = summarize(txs);
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Ingresos</span>
                      <span className="tabular-nums">
                        {formatMoney(s.incomeConfirmed)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Gastos</span>
                      <span className="tabular-nums">
                        {formatMoney(s.expenseConfirmed)}
                      </span>
                    </div>
                    <div className="border-t border-border pt-2 flex items-center justify-between font-medium">
                      <span>Resultado neto</span>
                      <span
                        className={
                          s.net >= 0 ? "text-emerald-700" : "text-rose-700"
                        }
                      >
                        {formatMoney(s.net)}
                      </span>
                    </div>
                    {s.incomePending > 0 ? (
                      <div className="text-[11px] text-muted-foreground">
                        Pendiente de cobro: {formatMoney(s.incomePending)}
                      </div>
                    ) : null}
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban size={14} /> Proyectos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin proyectos vinculados.</p>
            ) : (
              <ul className="space-y-1.5">
                {projects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <Link href={`/projects/${p.id}`} className="text-sm hover:underline truncate">
                      {p.name}
                    </Link>
                    <Badge tone={projectStatusTone(p.status)}>
                      {PROJECT_STATUSES.find((s) => s.value === p.status)?.label}
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
              <ListChecks size={14} /> Tareas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin tareas asociadas.</p>
            ) : (
              <ul className="space-y-1.5">
                {tasks.map((t) => (
                  <li key={t.id} className="text-sm">
                    <Link
                      href="/tasks"
                      className="hover:underline"
                    >
                      {t.title}
                    </Link>
                    {t.due_date ? (
                      <span className="text-[11px] text-muted-foreground">
                        {" · "}
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
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon size={14} /> Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin eventos asociados.</p>
            ) : (
              <ul className="space-y-1.5">
                {events.map((e) => (
                  <li key={e.id} className="text-sm">
                    {e.title}
                    <span className="text-[11px] text-muted-foreground">
                      {" · "}
                      {smartDateLabel(e.start_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell size={14} /> Recordatorios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin recordatorios.</p>
            ) : (
              <ul className="space-y-1.5">
                {reminders.map((r) => (
                  <li key={r.id} className="text-sm">
                    {r.title}
                    <span className="text-[11px] text-muted-foreground">
                      {" · "}
                      {smartDateLabel(r.remind_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ClientEditor
        open={editorOpen}
        client={client}
        onClose={() => setEditorOpen(false)}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    </>
  );
}

function Info({
  label,
  value,
  link,
}: {
  label: string;
  value: string | null | undefined;
  link?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm">
        {value ? (
          link ? (
            <a
              href={value.startsWith("http") ? value : `https://${value}`}
              target="_blank"
              rel="noreferrer noopener"
              className="hover:underline"
            >
              {value}
            </a>
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
