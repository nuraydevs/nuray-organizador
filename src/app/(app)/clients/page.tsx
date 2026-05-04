"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Spinner";
import { Badge, priorityTone } from "@/components/ui/Badge";
import { ClientEditor } from "@/components/clients/ClientEditor";
import { listClients } from "@/lib/repositories/clients";
import type { Client } from "@/types/database";
import { CLIENT_STATUSES, PRIORITIES } from "@/types/app";
import { smartDateLabel } from "@/lib/utils/dates";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const c = await listClients();
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
      if (q) {
        const blob = `${c.name} ${c.business_name ?? ""} ${c.contact_name ?? ""} ${c.email ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [clients, search, statusFilter, priorityFilter]);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }
  function onSaved(saved: Client) {
    setClients((prev) => {
      const idx = prev.findIndex((x) => x.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const copy = prev.slice();
      copy[idx] = saved;
      return copy;
    });
    setEditorOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="CRM ligero para Nuray. Estado comercial, próximas acciones y proyectos."
        actions={
          <Button onClick={openNew}>
            <Plus size={14} />
            Nuevo cliente
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
            placeholder="Buscar cliente..."
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          {CLIENT_STATUSES.map((s) => (
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
          title="Sin clientes"
          description="Crea tu primer cliente para empezar."
          action={
            <Button onClick={openNew}>
              <Plus size={14} /> Nuevo cliente
            </Button>
          }
        />
      ) : (
        <>
          {/* desktop table */}
          <div className="hidden md:block bg-white border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Nombre</th>
                  <th className="text-left font-medium px-3 py-2">Estado</th>
                  <th className="text-left font-medium px-3 py-2">Proyecto</th>
                  <th className="text-left font-medium px-3 py-2">Prioridad</th>
                  <th className="text-left font-medium px-3 py-2">Próxima acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-border hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/clients/${c.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.business_name ? (
                        <div className="text-[11px] text-muted-foreground">
                          {c.business_name}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {CLIENT_STATUSES.find((s) => s.value === c.status)?.label}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {c.project_status}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={priorityTone(c.priority)}>
                        {PRIORITIES.find((p) => p.value === c.priority)?.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {c.next_action ? (
                        <>
                          {c.next_action}
                          {c.next_action_date ? (
                            <span className="text-muted-foreground">
                              {" · "}
                              {smartDateLabel(c.next_action_date)}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="block bg-white border border-border rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    {c.business_name ? (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {c.business_name}
                      </div>
                    ) : null}
                  </div>
                  <Badge tone={priorityTone(c.priority)}>
                    {PRIORITIES.find((p) => p.value === c.priority)?.label}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="info">
                    {CLIENT_STATUSES.find((s) => s.value === c.status)?.label}
                  </Badge>
                  <Badge tone="muted">{c.project_status}</Badge>
                </div>
                {c.next_action ? (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Próxima acción: {c.next_action}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        </>
      )}

      <ClientEditor
        open={editorOpen}
        client={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={onSaved}
      />
    </>
  );
}
