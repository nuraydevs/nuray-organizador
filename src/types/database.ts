// Generated-style types for the Supabase schema in supabase/schema.sql.
// These are hand-maintained because we don't run the Supabase type generator.

export type TaskStatus = "pending" | "in_progress" | "blocked" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";

export type ClientStatus =
  | "lead"
  | "contacted"
  | "meeting_scheduled"
  | "proposal_sent"
  | "active"
  | "delivered"
  | "maintenance"
  | "lost";

export type ClientProjectStatus =
  | "not_started"
  | "planning"
  | "in_progress"
  | "waiting_client"
  | "review"
  | "delivered"
  | "maintenance";

export type PaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "not_applicable";

export type ProjectType = "agency" | "study" | "personal" | "internal";
export type ProjectStatus = "active" | "paused" | "completed" | "archived";

export type CalendarEventType =
  | "work"
  | "study"
  | "client"
  | "personal"
  | "reminder"
  | "deadline";

export type ReminderChannel = "app" | "telegram";
export type ReminderStatus = "scheduled" | "sent" | "failed" | "cancelled";
export type ReminderRelatedType =
  | "task"
  | "event"
  | "client"
  | "project"
  | "custom";

export type NotificationTargetType = "individual" | "team";

export type QuickCaptureType = "text" | "audio";
export type QuickCaptureStatus = "pending" | "processed";

export interface DbBase {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Client extends DbBase {
  name: string;
  business_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: ClientStatus;
  project_status: ClientProjectStatus;
  priority: Priority;
  budget: number | null;
  start_date: string | null;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
  important_links: ImportantLink[] | null;
  payment_status: PaymentStatus;
}

export interface ImportantLink {
  label: string;
  url: string;
}

export interface Project extends DbBase {
  name: string;
  description: string | null;
  type: ProjectType;
  status: ProjectStatus;
  priority: Priority;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
}

export interface Task extends DbBase {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  client_id: string | null;
  project_id: string | null;
  reminder_id: string | null;
  tags: string[];
}

export interface TaskChecklistItem extends DbBase {
  task_id: string;
  title: string;
  is_done: boolean;
  position: number;
}

export interface CalendarEvent extends DbBase {
  title: string;
  description: string | null;
  type: CalendarEventType;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  client_id: string | null;
  project_id: string | null;
  task_id: string | null;
  location: string | null;
}

export interface Reminder extends DbBase {
  title: string;
  message: string | null;
  remind_at: string;
  channel: ReminderChannel;
  status: ReminderStatus;
  related_type: ReminderRelatedType | null;
  related_id: string | null;
  notification_target_id: string | null;
  telegram_sent_at: string | null;
  error_message: string | null;
}

export interface NotificationTarget extends DbBase {
  name: string;
  type: NotificationTargetType;
  telegram_chat_id: string;
  is_default: boolean;
  is_active: boolean;
  notes: string | null;
}

export interface QuickCapture extends DbBase {
  type: QuickCaptureType;
  content: string | null;
  audio_url: string | null;
  audio_path: string | null;
  status: QuickCaptureStatus;
  source: string | null;
}

export interface AppSetting extends DbBase {
  key: string;
  value: unknown;
}
