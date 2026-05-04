interface SendInput {
  message: string;
  /** Override default chat. If omitted, uses TELEGRAM_CHAT_ID. */
  chatId?: string;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

/**
 * Sends a message via the Telegram Bot API.
 * Returns { ok, error } and never throws so callers can record the error
 * without breaking the rest of a batch run.
 */
export async function sendTelegramMessage({
  message,
  chatId,
}: SendInput): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const defaultChat = process.env.TELEGRAM_CHAT_ID;
  const targetChat = chatId ?? defaultChat;

  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN no configurado" };
  }
  if (!targetChat) {
    return { ok: false, error: "TELEGRAM_CHAT_ID no configurado" };
  }
  if (!message?.trim()) {
    return { ok: false, error: "Mensaje vacío" };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetChat,
          text: message,
          disable_web_page_preview: true,
        }),
      },
    );
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
    };
    if (!res.ok || !json?.ok) {
      return {
        ok: false,
        error: json?.description ?? `HTTP ${res.status}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
