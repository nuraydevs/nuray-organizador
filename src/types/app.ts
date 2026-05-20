import type {
  CalendarEventType,
  ClientStatus,
  FinanceStatus,
  FinanceType,
  Priority,
  ProjectStatus,
  ProjectType,
  TaskStatus,
  TeamMember,
} from "./database";

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En curso" },
  { value: "blocked", label: "Bloqueada" },
  { value: "done", label: "Hecha" },
];

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

export const CLIENT_STATUSES: { value: ClientStatus; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "contacted", label: "Contactado" },
  { value: "meeting_scheduled", label: "Reunión agendada" },
  { value: "proposal_sent", label: "Propuesta enviada" },
  { value: "active", label: "Activo" },
  { value: "delivered", label: "Entregado" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "lost", label: "Perdido" },
];

export const EVENT_TYPES: { value: CalendarEventType; label: string }[] = [
  { value: "work", label: "Trabajo" },
  { value: "study", label: "Estudio" },
  { value: "client", label: "Cliente" },
  { value: "personal", label: "Personal" },
  { value: "reminder", label: "Recordatorio" },
  { value: "deadline", label: "Deadline" },
];

import type { NotificationTargetType } from "./database";

export const NOTIFICATION_TARGET_TYPES: { value: NotificationTargetType; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "team", label: "Equipo" },
];

// --- Proyectos -------------------------------------------------
export const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: "agency", label: "Agencia" },
  { value: "study", label: "Estudio" },
  { value: "personal", label: "Personal" },
  { value: "internal", label: "Interno" },
];

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "pending", label: "Pendiente" },
  { value: "active", label: "Activo" },
  { value: "on_hold", label: "En espera" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
];

// --- Equipo Nuray ---------------------------------------------
export const TEAM_MEMBERS: { value: TeamMember; label: string }[] = [
  { value: "oliver", label: "Óliver" },
  { value: "armando", label: "Armando" },
  { value: "alvaro", label: "Álvaro" },
];

export function teamMemberLabel(value: string | null | undefined): string {
  if (!value) return "Sin asignar";
  return TEAM_MEMBERS.find((m) => m.value === value)?.label ?? value;
}

// --- Finanzas --------------------------------------------------
export const FINANCE_TYPES: { value: FinanceType; label: string }[] = [
  { value: "income", label: "Ingreso" },
  { value: "expense", label: "Gasto" },
];

export const FINANCE_STATUSES: { value: FinanceStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmado" },
];

export const INCOME_CATEGORIES: { value: string; label: string }[] = [
  { value: "client", label: "Cliente" },
  { value: "project", label: "Proyecto" },
  { value: "recurring_service", label: "Servicio recurrente" },
  { value: "other", label: "Otro" },
];

export const EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: "software", label: "Software" },
  { value: "subscriptions", label: "Suscripciones" },
  { value: "advertising", label: "Publicidad" },
  { value: "travel", label: "Desplazamientos" },
  { value: "collaborators", label: "Colaboradores" },
  { value: "infrastructure", label: "Infraestructura" },
  { value: "training", label: "Formación" },
  { value: "other", label: "Otros" },
];

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "transfer", label: "Transferencia" },
  { value: "card", label: "Tarjeta" },
  { value: "cash", label: "Efectivo" },
  { value: "paypal", label: "PayPal" },
  { value: "direct_debit", label: "Domiciliación" },
  { value: "other", label: "Otro" },
];

export function financeCategoryLabel(
  type: FinanceType,
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const list = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.value === value)?.label ?? value;
}

export function paymentMethodLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return PAYMENT_METHODS.find((p) => p.value === value)?.label ?? value;
}

export const APP_VERSION = "0.3.0";
