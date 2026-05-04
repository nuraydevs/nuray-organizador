import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { CalendarEvent } from "@/types/database";

const TABLE = "calendar_events";

export async function listEvents(): Promise<CalendarEvent[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .order("start_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CalendarEvent[];
}

export async function listEventsBetween(
  startISO: string,
  endISO: string,
): Promise<CalendarEvent[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .gte("start_at", startISO)
    .lt("start_at", endISO)
    .order("start_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CalendarEvent[];
}

export async function createEvent(input: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const sb = getSupabaseBrowser();
  const payload = {
    title: input.title?.trim() ?? "",
    description: input.description ?? null,
    type: input.type ?? "work",
    start_at: input.start_at ?? new Date().toISOString(),
    end_at: input.end_at ?? null,
    all_day: input.all_day ?? false,
    client_id: input.client_id ?? null,
    project_id: input.project_id ?? null,
    task_id: input.task_id ?? null,
    location: input.location ?? null,
  };
  const { data, error } = await sb.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return data as CalendarEvent;
}

export async function updateEvent(
  id: string,
  patch: Partial<CalendarEvent>,
): Promise<CalendarEvent> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CalendarEvent;
}

export async function deleteEvent(id: string): Promise<void> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
