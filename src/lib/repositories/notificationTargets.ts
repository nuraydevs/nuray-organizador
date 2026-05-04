import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { NotificationTarget } from "@/types/database";

const TABLE = "notification_targets";

export async function listTargets(activeOnly = false): Promise<NotificationTarget[]> {
  const sb = getSupabaseBrowser();
  let q = sb.from(TABLE).select("*").order("created_at", { ascending: true });
  if (activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as NotificationTarget[];
}

export async function createTarget(
  input: Partial<NotificationTarget>,
): Promise<NotificationTarget> {
  const sb = getSupabaseBrowser();
  const payload = {
    name: input.name?.trim() ?? "",
    type: input.type ?? "individual",
    telegram_chat_id: input.telegram_chat_id?.trim() ?? "",
    is_default: input.is_default ?? false,
    is_active: input.is_active ?? true,
    notes: input.notes ?? null,
  };
  const { data, error } = await sb.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  return data as NotificationTarget;
}

export async function updateTarget(
  id: string,
  patch: Partial<NotificationTarget>,
): Promise<NotificationTarget> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as NotificationTarget;
}

export async function deleteTarget(id: string): Promise<void> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

/**
 * If a target is being marked as default, unset the default flag on all others.
 * Idempotent — safe to call repeatedly.
 */
export async function setAsDefault(id: string): Promise<NotificationTarget> {
  const sb = getSupabaseBrowser();
  // Unset all others first
  await sb.from(TABLE).update({ is_default: false }).neq("id", id);
  const { data, error } = await sb
    .from(TABLE)
    .update({ is_default: true })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as NotificationTarget;
}
