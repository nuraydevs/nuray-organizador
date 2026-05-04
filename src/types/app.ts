import type {
  CalendarEventType,
  ClientStatus,
  Priority,
  TaskStatus,
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

export const APP_VERSION = "0.2.0";
