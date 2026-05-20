"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, financeStatusTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Spinner";
import { FinanceEditor } from "@/components/finance/FinanceEditor";
import { listTransactions } from "@/lib/repositories/finance";
import { listClients } from "@/lib/repositories/clients";
import { listProjects } from "@/lib/repositories/projects";
import type {
  Client,
  FinanceTransaction,
  FinanceType,
  Project,
} from "@/types/database";
import {
  EXPENSE_CATEGORIES,
  FINANCE_STATUSES,
  FINANCE_TYPES,
  financeCategoryLabel,
} from "@/types/app";
import { formatDate, parseDateOnly } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { summarize, isOverdue, inMonth } from "@/lib/finance/summary";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function FinancePage() {
  const now = new Date();
  const [txs, setTxs] = useState<FinanceTransaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | "all">(now.getMonth());
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceTransaction | null>(null);
  const [editorType, setEditorType] = useState<FinanceType>("income");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [f, c, p] = await Promise.all([
        listTransactions(),
        listClients(),
        listProjects(),
      ]);
      setTxs(f);
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

  const clientName = (idv: string | null) =>
    idv ? clients.find((c) => c.id === idv)?.name ?? null : null;
  const projectName = (idv: string | null) =>
    idv ? projects.find((p) => p.id === idv)?.name ?? null : null;

  const inPeriod = useCallback(
    (tx: FinanceTransaction) => {
      const d = parseDateOnly(tx.transaction_date);
      if (!d || d.getFullYear() !== year) return false;
      if (month !== "all" && d.getMonth() !== month) return false;
      return true;
    },
    [year, month],
  );

  // KPIs of the selected period
  const periodSummary = useMemo(
    () => summarize(txs.filter(inPeriod)),
    [txs, inPeriod],
  );

  // Outstanding receivables/payables are global, not period-bound.
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

  // Net of previous month (same year boundary handled) for variation.
  const prevNet = useMemo(() => {
    if (month === "all") return null;
    let py = year;
    let pm = month - 1;
    if (pm < 0) {
      pm = 11;
      py -= 1;
    }
    return summarize(txs.filter((t) => inMonth(t.transaction_date, py, pm))).net;
  }, [txs, year, month]);

  const netVariation = useMemo(() => {
    if (prevNet == null) return null;
    const diff = periodSummary.net - prevNet;
    const pct = prevNet !== 0 ? (diff / Math.abs(prevNet)) * 100 : null;
    return { diff, pct };
  }, [periodSummary.net, prevNet]);

  // Last 6 months income vs expense (confirmed)
  const monthlySeries = useMemo(() => {
    const base = month === "all" ? new Date(year, 11, 1) : new Date(year, month, 1);
    const out: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const s = summarize(
        txs.filter((t) => inMonth(t.transaction_date, d.getFullYear(), d.getMonth())),
      );
      out.push({
        label: MONTHS[d.getMonth()].slice(0, 3),
        income: s.incomeConfirmed,
        expense: s.expenseConfirmed,
      });
    }
    return out;
  }, [txs, year, month]);

  const maxMonthly = useMemo(
    () => Math.max(1, ...monthlySeries.flatMap((m) => [m.income, m.expense])),
    [monthlySeries],
  );

  // Expense distribution by category (confirmed, in period)
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of txs) {
      if (tx.type !== "expense" || tx.status !== "confirmed" || !inPeriod(tx)) continue;
      const key = tx.category ?? "other";
      map.set(key, (map.get(key) ?? 0) + (Number(tx.amount) || 0));
    }
    const total = [...map.values()].reduce((a, b) => a + b, 0);
    return {
      total,
      rows: [...map.entries()]
        .map(([cat, amount]) => ({ cat, amount }))
        .sort((a, b) => b.amount - a.amount),
    };
  }, [txs, inPeriod]);

  const filtered = useMemo(() => {
    return txs.filter((tx) => {
      if (!inPeriod(tx)) return false;
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      if (categoryFilter !== "all" && tx.category !== categoryFilter) return false;
      if (projectFilter !== "all" && tx.project_id !== projectFilter) return false;
      if (clientFilter !== "all" && tx.client_id !== clientFilter) return false;
      return true;
    });
  }, [txs, inPeriod, typeFilter, statusFilter, categoryFilter, projectFilter, clientFilter]);

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    txs.forEach((t) => {
      const d = parseDateOnly(t.transaction_date);
      if (d) set.add(d.getFullYear());
    });
    return [...set].sort((a, b) => b - a);
  }, [txs]);

  function openNew(type: FinanceType) {
    setEditing(null);
    setEditorType(type);
    setEditorOpen(true);
  }
  function openEdit(tx: FinanceTransaction) {
    setEditing(tx);
    setEditorType(tx.type);
    setEditorOpen(true);
  }
  function onSaved(tx: FinanceTransaction) {
    setTxs((prev) => {
      const idx = prev.findIndex((x) => x.id === tx.id);
      if (idx === -1) return [tx, ...prev];
      const copy = prev.slice();
      copy[idx] = tx;
      return copy;
    });
    setEditorOpen(false);
  }
  function onDeleted(idv: string) {
    setTxs((prev) => prev.filter((x) => x.id !== idv));
    setEditorOpen(false);
  }

  const periodLabel = month === "all" ? `${year}` : `${MONTHS[month]} ${year}`;

  return (
    <>
      <PageHeader
        title="Finanzas"
        description="Control económico interno de Nuray: ingresos, gastos y resultado."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openNew("expense")}>
              <Plus size={14} /> Registrar gasto
            </Button>
            <Button onClick={() => openNew("income")}>
              <Plus size={14} /> Registrar ingreso
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select
          value={String(month)}
          onChange={(e) =>
            setMonth(e.target.value === "all" ? "all" : Number(e.target.value))
          }
          className="w-auto"
        >
          <option value="all">Todo el año</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </Select>
        <Select
          value={String(year)}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-auto"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <span className="text-xs text-muted-foreground">Periodo: {periodLabel}</span>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <EmptyState
          title="Error al cargar"
          description={error}
          action={<Button onClick={load}>Reintentar</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
            <Kpi label="Ingresos" value={formatMoney(periodSummary.incomeConfirmed)} />
            <Kpi label="Gastos" value={formatMoney(periodSummary.expenseConfirmed)} />
            <Kpi
              label="Resultado neto"
              value={formatMoney(periodSummary.net)}
              tone={periodSummary.net >= 0 ? "pos" : "neg"}
              sub={
                netVariation
                  ? {
                      text:
                        netVariation.pct != null
                          ? `${netVariation.diff >= 0 ? "+" : ""}${netVariation.pct.toFixed(0)}% vs mes anterior`
                          : `${netVariation.diff >= 0 ? "+" : ""}${formatMoney(netVariation.diff)} vs mes anterior`,
                      up: netVariation.diff >= 0,
                    }
                  : undefined
              }
            />
            <Kpi label="Pendiente de cobro" value={formatMoney(outstanding.income)} />
            <Kpi label="Pendiente de pago" value={formatMoney(outstanding.expense)} />
            <Kpi
              label="Margen"
              value={periodSummary.margin != null ? `${periodSummary.margin.toFixed(0)}%` : "—"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={14} /> Ingresos vs gastos (6 meses)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-2 h-40">
                  {monthlySeries.map((m) => (
                    <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex items-end gap-1 h-32 w-full justify-center">
                        <div
                          className="w-3 sm:w-4 rounded-t bg-emerald-500"
                          style={{ height: `${(m.income / maxMonthly) * 100}%` }}
                          title={`Ingresos: ${formatMoney(m.income)}`}
                        />
                        <div
                          className="w-3 sm:w-4 rounded-t bg-rose-400"
                          style={{ height: `${(m.expense / maxMonthly) * 100}%` }}
                          title={`Gastos: ${formatMoney(m.expense)}`}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{m.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Ingresos
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-rose-400" /> Gastos
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown size={14} /> Gastos por categoría · {periodLabel}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expenseByCategory.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sin gastos confirmados en este periodo.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {expenseByCategory.rows.map((r) => {
                      const pct = expenseByCategory.total
                        ? Math.round((r.amount / expenseByCategory.total) * 100)
                        : 0;
                      return (
                        <li key={r.cat}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>{financeCategoryLabel("expense", r.cat)}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {formatMoney(r.amount)} · {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-rose-400"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">Todos los tipos</option>
              {FINANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Todos los estados</option>
              {FINANCE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">Toda categoría</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="all">Todos los proyectos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
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
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="Sin movimientos"
              description="No hay ingresos ni gastos para este periodo y filtros."
              action={
                <Button onClick={() => openNew("income")}>
                  <Plus size={14} /> Registrar ingreso
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
                      <th className="text-left font-medium px-3 py-2">Fecha</th>
                      <th className="text-left font-medium px-3 py-2">Concepto</th>
                      <th className="text-left font-medium px-3 py-2">Categoría</th>
                      <th className="text-left font-medium px-3 py-2">Vínculo</th>
                      <th className="text-left font-medium px-3 py-2">Estado</th>
                      <th className="text-right font-medium px-3 py-2">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((tx) => {
                      const overdue = isOverdue(tx);
                      const link =
                        projectName(tx.project_id) ?? clientName(tx.client_id);
                      return (
                        <tr
                          key={tx.id}
                          onClick={() => openEdit(tx)}
                          className="border-t border-border hover:bg-muted/30 cursor-pointer"
                        >
                          <td className="px-3 py-2 text-xs whitespace-nowrap">
                            {formatDate(tx.transaction_date)}
                          </td>
                          <td className="px-3 py-2">{tx.concept}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {financeCategoryLabel(tx.type, tx.category)}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {link ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge tone={financeStatusTone(tx.status, overdue)}>
                              {overdue
                                ? "Vencido"
                                : FINANCE_STATUSES.find((s) => s.value === tx.status)?.label}
                            </Badge>
                          </td>
                          <td
                            className={`px-3 py-2 text-right tabular-nums font-medium ${
                              tx.type === "income" ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {tx.type === "income" ? "+" : "−"}
                            {formatMoney(Number(tx.amount))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* mobile cards */}
              <div className="md:hidden space-y-2">
                {filtered.map((tx) => {
                  const overdue = isOverdue(tx);
                  const link = projectName(tx.project_id) ?? clientName(tx.client_id);
                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => openEdit(tx)}
                      className="w-full text-left bg-white border border-border rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{tx.concept}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatDate(tx.transaction_date)}
                            {link ? ` · ${link}` : ""}
                          </div>
                        </div>
                        <div
                          className={`text-sm font-semibold tabular-nums shrink-0 inline-flex items-center gap-0.5 ${
                            tx.type === "income" ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {tx.type === "income" ? (
                            <ArrowUpRight size={13} />
                          ) : (
                            <ArrowDownRight size={13} />
                          )}
                          {formatMoney(Number(tx.amount))}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone={financeStatusTone(tx.status, overdue)}>
                          {overdue
                            ? "Vencido"
                            : FINANCE_STATUSES.find((s) => s.value === tx.status)?.label}
                        </Badge>
                        <Badge tone="muted">
                          {financeCategoryLabel(tx.type, tx.category)}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <FinanceEditor
        open={editorOpen}
        transaction={editing}
        clients={clients}
        projects={projects}
        defaultType={editorType}
        onClose={() => setEditorOpen(false)}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    </>
  );
}

function Kpi({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
  sub?: { text: string; up: boolean };
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
      {sub ? (
        <div
          className={`mt-0.5 text-[11px] inline-flex items-center gap-0.5 ${
            sub.up ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {sub.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {sub.text}
        </div>
      ) : null}
    </div>
  );
}
