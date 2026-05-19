import { NextResponse } from "next/server";
import { syncClientToNurayAnalytics } from "@/lib/integrations/nuray-analytics";
import {
  getSupabaseServer,
  isSupabaseConfiguredServer,
} from "@/lib/supabase/server";
import type { Client } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SyncRequestBody {
  clientId?: unknown;
}

async function updateAnalyticsSyncFields(
  clientId: string,
  patch: Partial<Client>,
): Promise<Client | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("clients")
    .update(patch)
    .eq("id", clientId)
    .select("*")
    .single();

  if (error) {
    console.error("[nuray-analytics] No se pudo registrar el estado de sync", {
      clientId,
      error: error.message,
    });
    return null;
  }

  return data as Client;
}

export async function POST(req: Request) {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json(
      { ok: false, error: "Supabase no está configurado" },
      { status: 500 },
    );
  }

  let body: SyncRequestBody;
  try {
    body = (await req.json()) as SyncRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Petición inválida" },
      { status: 400 },
    );
  }

  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "Falta clientId" },
      { status: 400 },
    );
  }

  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    console.error("[nuray-analytics] No se pudo leer el cliente", {
      clientId,
      error: error.message,
    });
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Cliente no encontrado" },
      { status: 404 },
    );
  }

  const client = data as Client;
  const result = await syncClientToNurayAnalytics(client);

  if (result.ok) {
    const syncedAt = new Date().toISOString();
    const updated = await updateAnalyticsSyncFields(client.id, {
      analytics_sync_status: "synced",
      analytics_last_synced_at: syncedAt,
      analytics_sync_error: null,
    });

    return NextResponse.json({
      ok: true,
      client: updated ?? client,
    });
  }

  const syncError = result.error ?? "Error desconocido";
  console.error("[nuray-analytics] Falló la sincronización del cliente", {
    clientId: client.id,
    error: syncError,
  });

  const updated = await updateAnalyticsSyncFields(client.id, {
    analytics_sync_status: "failed",
    analytics_sync_error: syncError,
  });

  return NextResponse.json({
    ok: false,
    error: syncError,
    client: updated ?? client,
  });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Method not allowed" },
    { status: 405 },
  );
}
