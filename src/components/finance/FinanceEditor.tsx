"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  EXPENSE_CATEGORIES,
  FINANCE_STATUSES,
  FINANCE_TYPES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
} from "@/types/app";
import type {
  Client,
  FinanceStatus,
  FinanceTransaction,
  FinanceType,
  Project,
} from "@/types/database";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/lib/repositories/finance";
import { fromInputDate, toInputDate } from "@/lib/utils/dates";

export function FinanceEditor({
  open,
  transaction,
  clients,
  projects,
  defaultType = "income",
  defaultProjectId = "",
  defaultClientId = "",
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  transaction: FinanceTransaction | null;
  clients: Client[];
  projects: Project[];
  defaultType?: FinanceType;
  defaultProjectId?: string;
  defaultClientId?: string;
  onClose: () => void;
  onSaved: (tx: FinanceTransaction) => void;
  onDeleted?: (id: string) => void;
}) {
  const toast = useToast();
  const [type, setType] = useState<FinanceType>(defaultType);
  const [status, setStatus] = useState<FinanceStatus>("confirmed");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(transaction?.type ?? defaultType);
    setStatus(transaction?.status ?? "confirmed");
    setAmount(transaction?.amount != null ? String(transaction.amount) : "");
    setConcept(transaction?.concept ?? "");
    setCategory(transaction?.category ?? "");
    setTransactionDate(
      toInputDate(transaction?.transaction_date) ||
        new Date().toISOString().slice(0, 10),
    );
    setDueDate(toInputDate(transaction?.due_date));
    setClientId(transaction?.client_id ?? defaultClientId);
    setProjectId(transaction?.project_id ?? defaultProjectId);
    setPaymentMethod(transaction?.payment_method ?? "");
    setNotes(transaction?.notes ?? "");
    setConfirmDelete(false);
  }, [open, transaction, defaultType, defaultProjectId, defaultClientId]);

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!concept.trim()) {
      toast.error("El concepto es obligatorio");
      return;
    }
    const value = Number(amount);
    if (!amount.trim() || Number.isNaN(value) || value <= 0) {
      toast.error("Introduce un importe válido mayor que 0");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<FinanceTransaction> = {
        type,
        status,
        amount: value,
        concept: concept.trim(),
        category: category || null,
        transaction_date: fromInputDate(transactionDate) ?? undefined,
        due_date: fromInputDate(dueDate),
        client_id: clientId || null,
        project_id: projectId || null,
        payment_method: paymentMethod || null,
        notes: notes.trim() || null,
      };
      const saved = transaction
        ? await updateTransaction(transaction.id, payload)
        : await createTransaction(payload);
      toast.success(transaction ? "Movimiento actualizado" : "Movimiento registrado");
      onSaved(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!transaction || submitting) return;
    setSubmitting(true);
    try {
      await deleteTransaction(transaction.id);
      toast.success("Movimiento eliminado");
      onDeleted?.(transaction.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setSubmitting(false);
    }
  }

  const title = transaction
    ? "Editar movimiento"
    : type === "income"
      ? "Registrar ingreso"
      : "Registrar gasto";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Concepto e importe son obligatorios. Puedes vincularlo a un cliente o proyecto."
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          {transaction ? (
            confirmDelete ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                ¿Borrar?
                <button
                  type="button"
                  className="text-destructive font-medium"
                  onClick={onDelete}
                  disabled={submitting}
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={submitting}
                >
                  No
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                disabled={submitting}
              >
                Eliminar
              </Button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" form="finance-editor" loading={submitting}>
              {transaction ? "Guardar cambios" : "Registrar"}
            </Button>
          </div>
        </div>
      }
    >
      <form id="finance-editor" onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Tipo" htmlFor="f-type">
            <Select
              id="f-type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as FinanceType);
                setCategory("");
              }}
            >
              {FINANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado" htmlFor="f-status">
            <Select
              id="f-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as FinanceStatus)}
            >
              {FINANCE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Importe (€)" htmlFor="f-amount" required>
            <Input
              id="f-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="0,00"
            />
          </Field>
        </div>

        <Field label="Concepto" htmlFor="f-concept" required>
          <Input
            id="f-concept"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            required
            autoFocus
            maxLength={200}
            placeholder={
              type === "income" ? "Ej. Web Haro · primer pago" : "Ej. Figma · suscripción"
            }
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Categoría" htmlFor="f-category">
            <Select
              id="f-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">— Sin categoría —</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha" htmlFor="f-date">
            <Input
              id="f-date"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
            />
          </Field>
          <Field
            label="Vencimiento"
            htmlFor="f-due"
            hint={status === "pending" ? "Para cobros/pagos pendientes" : undefined}
          >
            <Input
              id="f-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Cliente" htmlFor="f-client">
            <Select
              id="f-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">— Sin cliente —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Proyecto" htmlFor="f-project">
            <Select
              id="f-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">— Sin proyecto —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Método de pago" htmlFor="f-method">
            <Select
              id="f-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="">— Sin especificar —</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Notas" htmlFor="f-notes">
          <Textarea
            id="f-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
