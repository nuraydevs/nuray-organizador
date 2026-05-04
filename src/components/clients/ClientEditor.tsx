"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { CLIENT_STATUSES, PRIORITIES } from "@/types/app";
import type {
  Client,
  ClientProjectStatus,
  ClientStatus,
  PaymentStatus,
  Priority,
} from "@/types/database";
import {
  createClient as createClientRecord,
  deleteClient,
  updateClient,
} from "@/lib/repositories/clients";
import { fromInputDateTime, toInputDateTime } from "@/lib/utils/dates";

const PROJECT_STATUSES: { value: ClientProjectStatus; label: string }[] = [
  { value: "not_started", label: "No iniciado" },
  { value: "planning", label: "Planificación" },
  { value: "in_progress", label: "En curso" },
  { value: "waiting_client", label: "Esperando cliente" },
  { value: "review", label: "Revisión" },
  { value: "delivered", label: "Entregado" },
  { value: "maintenance", label: "Mantenimiento" },
];

const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: "unpaid", label: "Sin pagar" },
  { value: "partially_paid", label: "Pagado parcial" },
  { value: "paid", label: "Pagado" },
  { value: "not_applicable", label: "No aplica" },
];

export function ClientEditor({
  open,
  client,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onSaved: (c: Client) => void;
  onDeleted?: (id: string) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<ClientStatus>("lead");
  const [projectStatus, setProjectStatus] = useState<ClientProjectStatus>("not_started");
  const [priority, setPriority] = useState<Priority>("medium");
  const [budget, setBudget] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(client?.name ?? "");
    setBusinessName(client?.business_name ?? "");
    setContactName(client?.contact_name ?? "");
    setPhone(client?.phone ?? "");
    setEmail(client?.email ?? "");
    setWebsite(client?.website ?? "");
    setStatus(client?.status ?? "lead");
    setProjectStatus(client?.project_status ?? "not_started");
    setPriority(client?.priority ?? "medium");
    setBudget(client?.budget != null ? String(client.budget) : "");
    setStartDate(client?.start_date ?? "");
    setNextAction(client?.next_action ?? "");
    setNextActionDate(toInputDateTime(client?.next_action_date));
    setNotes(client?.notes ?? "");
    setPaymentStatus(client?.payment_status ?? "not_applicable");
    setConfirmDelete(false);
  }, [open, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<Client> = {
        name,
        business_name: businessName.trim() || null,
        contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        status,
        project_status: projectStatus,
        priority,
        budget: budget ? Number(budget) : null,
        start_date: startDate || null,
        next_action: nextAction.trim() || null,
        next_action_date: fromInputDateTime(nextActionDate),
        notes: notes.trim() || null,
        payment_status: paymentStatus,
      };
      const saved = client
        ? await updateClient(client.id, payload)
        : await createClientRecord(payload);
      toast.success(client ? "Cliente actualizado" : "Cliente creado");
      onSaved(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!client || submitting) return;
    setSubmitting(true);
    try {
      await deleteClient(client.id);
      toast.success("Cliente eliminado");
      onDeleted?.(client.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? "Editar cliente" : "Nuevo cliente"}
      description="Solo el nombre es obligatorio. Puedes completar el resto más tarde."
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          {client ? (
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
            <Button type="submit" form="client-editor" loading={submitting}>
              {client ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </div>
      }
    >
      <form id="client-editor" onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nombre" htmlFor="c-name" required>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              maxLength={200}
            />
          </Field>
          <Field label="Negocio" htmlFor="c-business">
            <Input
              id="c-business"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Persona de contacto" htmlFor="c-contact">
            <Input
              id="c-contact"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </Field>
          <Field label="Teléfono" htmlFor="c-phone">
            <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email" htmlFor="c-email">
            <Input
              id="c-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Web" htmlFor="c-web">
            <Input id="c-web" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Estado comercial" htmlFor="c-status">
            <Select
              id="c-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ClientStatus)}
            >
              {CLIENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado del proyecto" htmlFor="c-pstatus">
            <Select
              id="c-pstatus"
              value={projectStatus}
              onChange={(e) =>
                setProjectStatus(e.target.value as ClientProjectStatus)
              }
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridad" htmlFor="c-prio">
            <Select
              id="c-prio"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Presupuesto (€)" htmlFor="c-budget">
            <Input
              id="c-budget"
              type="number"
              min={0}
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </Field>
          <Field label="Fecha de inicio" htmlFor="c-start">
            <Input
              id="c-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="Estado de pago" htmlFor="c-pay">
            <Select
              id="c-pay"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
            >
              {PAYMENT_STATUSES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Próxima acción" htmlFor="c-next">
            <Input
              id="c-next"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="Ej. Llamar para confirmar"
            />
          </Field>
          <Field label="Fecha de próxima acción" htmlFor="c-next-date">
            <Input
              id="c-next-date"
              type="datetime-local"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Notas" htmlFor="c-notes">
          <Textarea
            id="c-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
