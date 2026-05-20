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

/**
 * Parse a date-only string ("YYYY-MM-DD") as LOCAL midnight. Using
 * `new Date("YYYY-MM-DD")` parses as UTC midnight, which shifts the calendar
 * day in negative-offset timezones. Datetime strings fall back to `toDate`.
 */
export function parseDateOnly(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toDate(value);
}

/** Local midnight of the current day. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
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
