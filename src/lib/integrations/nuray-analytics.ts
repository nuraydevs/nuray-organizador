import type { Client } from "@/types/database";

const CLIENT_SYNC_PATH = "/api/integrations/nuray-organizador/client";

export interface NurayAnalyticsClientPayload {
  organizerClientId: string;
  name: string;
  businessName: string | null;
  description: string | null;
  sector: string | null;
  website: string | null;
  instagram: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  nextMeetingAt: string | null;
  status: Client["status"];
}

export interface NurayAnalyticsSyncResult {
  ok: boolean;
  error?: string;
}

export function buildNurayAnalyticsClientPayload(
  client: Client,
): NurayAnalyticsClientPayload {
  return {
    organizerClientId: client.id,
    name: client.name,
    businessName: client.business_name,
    description: null,
    sector: null,
    website: client.website,
    instagram: null,
    email: client.email,
    phone: client.phone,
    notes: client.notes,
    nextMeetingAt: client.next_action_date,
    status: client.status,
  };
}

export async function syncClientToNurayAnalytics(
  client: Client,
): Promise<NurayAnalyticsSyncResult> {
  const baseUrl = process.env.NURAY_ANALYTICS_URL?.trim();
  const secret = process.env.NURAY_ORGANIZADOR_SYNC_SECRET?.trim();

  if (!baseUrl) {
    return { ok: false, error: "NURAY_ANALYTICS_URL no configurada" };
  }
  if (!secret) {
    return {
      ok: false,
      error: "NURAY_ORGANIZADOR_SYNC_SECRET no configurada",
    };
  }

  const endpoint = `${baseUrl.replace(/\/+$/, "")}${CLIENT_SYNC_PATH}`;
  const payload = buildNurayAnalyticsClientPayload(client);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Nuray Analytics respondió ${res.status}${
          detail ? `: ${detail.slice(0, 300)}` : ""
        }`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Error de red con Nuray Analytics: ${err.message}`
          : "Error de red con Nuray Analytics",
    };
  }
}
