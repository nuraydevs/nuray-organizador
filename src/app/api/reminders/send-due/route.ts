import { NextResponse } from "next/server";
import { getSupabaseServer, isSupabaseConfiguredServer } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram/sendTelegramMessage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const expected = process.env.REMINDER_CRON_SECRET;
  if (!expected) return false;
  const auth = req.headers.get("authorization");
  if (auth && auth === `Bearer ${expected}`) return true;
  const url = new URL(req.url);
  const q = url.searchParams.get("secret");
  if (q && q === expected) return true;
  return false;
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json(
      { error: "Supabase no está configurado" },
      { status: 500 },
    );
  }

  const sb = getSupabaseServer();
  const nowIso = new Date().toISOString();

  const { data, error } = await sb
    .from("reminders")
    .select("*")
    .eq("status", "scheduled")
    .eq("channel", "telegram")
    .lte("remind_at", nowIso);

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "supabase error" },
      { status: 500 },
    );
  }

  const due = data ?? [];
  let sent = 0;
  let failed = 0;

  for (const r of due) {
    const text = `${r.title}${r.message ? `\n\n${r.message}` : ""}`;
    const result = await sendTelegramMessage({ message: text });
    if (result.ok) {
      sent++;
      await sb
        .from("reminders")
        .update({
          status: "sent",
          telegram_sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", r.id);
    } else {
      failed++;
      await sb
        .from("reminders")
        .update({
          status: "failed",
          error_message: result.error ?? "unknown error",
        })
        .eq("id", r.id);
    }
  }

  return NextResponse.json({
    processed: due.length,
    sent,
    failed,
  });
}

export const GET = handle;
export const POST = handle;
