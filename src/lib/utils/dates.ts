import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}

export function formatDate(value: string | Date | null | undefined, pattern = "dd MMM yyyy") {
  const date = toDate(value);
  if (!date) return "—";
  return format(date, pattern, { locale: es });
}

export function formatDateTime(value: string | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return "—";
  return format(date, "dd MMM yyyy · HH:mm", { locale: es });
}

export function formatTime(value: string | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return "—";
  return format(date, "HH:mm", { locale: es });
}

export function relativeFromNow(value: string | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return "—";
  return formatDistanceToNowStrict(date, { addSuffix: true, locale: es });
}

export function smartDateLabel(value: string | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return "Sin fecha";
  if (isToday(date)) return `Hoy · ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Mañana · ${format(date, "HH:mm")}`;
  if (isYesterday(date)) return `Ayer · ${format(date, "HH:mm")}`;
  return format(date, "dd MMM · HH:mm", { locale: es });
}

export function toInputDateTime(value: string | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return "";
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function fromInputDateTime(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function toInputDate(value: string | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
}

export function fromInputDate(value: string): string | null {
  if (!value) return null;
  return value;
}
