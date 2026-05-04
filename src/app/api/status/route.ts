import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reports which env vars are configured. Returns booleans only — never values.
 * Used by the Settings page to render status indicators.
 */
export async function GET() {
  return NextResponse.json({
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    accessCode: Boolean(process.env.NURAY_ACCESS_CODE),
    telegramBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    telegramChatId: Boolean(process.env.TELEGRAM_CHAT_ID),
    reminderCronSecret: Boolean(process.env.REMINDER_CRON_SECRET),
  });
}
