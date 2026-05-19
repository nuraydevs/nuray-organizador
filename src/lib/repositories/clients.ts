import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Client } from "@/types/database";

const TABLE = "clients";
const ANALYTICS_SYNC_ENDPOINT = "/api/integrations/nuray-analytics/client";

async function requestNurayAnalyticsSync(clientId: string): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const res = await fetch(ANALYTICS_SYNC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };

    if (!res.ok || json.ok === false) {
      console.error("[nuray-analytics] No se pudo sincronizar el cliente", {
        clientId,
        error: json.error ?? `HTTP ${res.status}`,
      });
    }
  } catch (err) {
    console.error("[nuray-analytics] No se pudo solicitar la sincronización", {
      clientId,
      error: err instanceof Error ? err.message : "Error desconocido",
    });
  }
}

export async function listClients(): Promise<Client[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function getClient(id: string): Promise<Client | null> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Client) ?? null;
}

export async function createClient(input: Partial<Client>): Promise<Client> {
  const sb = getSupabaseBrowser();
  const payload = {
    name: input.name?.trim() ?? "",
    business_name: input.business_name ?? null,
    contact_name: input.contact_name ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    website: input.website ?? null,
    status: input.status ?? "lead",
    project_status: input.project_status ?? "not_started",
    priority: input.priority ?? "medium",
    budget: input.budget ?? null,
    start_date: input.start_date ?? null,
    next_action: input.next_action ?? null,
    next_action_date: input.next_action_date ?? null,
    notes: input.notes ?? null,
    important_links: input.important_links ?? null,
    payment_status: input.payment_status ?? "unpaid",
  };
  const { data, error } = await sb.from(TABLE).insert(payload).select().single();
  if (error) throw error;
  const client = data as Client;
  void requestNurayAnalyticsSync(client.id);
  return client;
}

export async function updateClient(id: string, patch: Partial<Client>): Promise<Client> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  const client = data as Client;
  void requestNurayAnalyticsSync(client.id);
  return client;
}

export async function deleteClient(id: string): Promise<void> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
