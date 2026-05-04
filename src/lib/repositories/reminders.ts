import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Reminder } from "@/types/database";

const TABLE = "reminders";

export async function listReminders(): Promise<Reminder[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .order("remind_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Reminder[];
}

export async function createReminder(input: Partial<Reminder>): Promise<Reminder> {
  const sb = getSupabaseBrowser();
  const payload = {
    title: input.title?.trim() ?? "",
    message: input.message ?? null,
    remind_at: input.remind_at ?? new Date().toISOString(),
    channel: input.channel ?? "app",
    status: input.status ?? "scheduled",
    related_type: input.related_type ?? null,
    related_id: input.related_id ?? null,
    notification_target_id: input.notification_target_id ?? null,
  };
  const { data, error } = await sb.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return data as Reminder;
}

export async function updateReminder(
  id: string,
  patch: Partial<Reminder>,
): Promise<Reminder> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Reminder;
}

export async function deleteReminder(id: string): Promise<void> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function retryReminder(id: string): Promise<Reminder> {
  return updateReminder(id, { status: "scheduled", error_message: null });
}
