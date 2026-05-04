import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB, OpenAI's Whisper hard limit

/**
 * POST /api/transcribe
 *
 * Receives multipart/form-data with a `file` field containing an audio
 * blob and forwards it to the OpenAI transcription API. The API key is
 * read server-side and never exposed to the client. Returns { text } on
 * success or { error } with a clear message on failure.
 */
export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY no configurada" },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Petición inválida (no es multipart/form-data)" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (file === null || typeof file === "string") {
    return NextResponse.json(
      { error: "Falta el campo 'file' con el audio" },
      { status: 400 },
    );
  }

  // file is a File / Blob from here on
  const blob = file;
  if (blob.size === 0) {
    return NextResponse.json({ error: "Audio vacío" }, { status: 400 });
  }
  if (blob.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Audio demasiado grande (máx. 25 MB)" },
      { status: 413 },
    );
  }

  // Reupload to OpenAI. We always pass a sensible filename so OpenAI can
  // detect the codec from the extension if the Content-Type is generic.
  const fileName = "name" in blob && typeof blob.name === "string" ? blob.name : "";
  const filename =
    fileName ||
    (blob.type.includes("mp4")
      ? "audio.mp4"
      : blob.type.includes("ogg")
      ? "audio.ogg"
      : "audio.webm");

  const upstream = new FormData();
  upstream.append("file", blob, filename);
  upstream.append("model", "whisper-1");

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Error de red al transcribir: ${err.message}`
            : "Error de red al transcribir",
      },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Try to surface the OpenAI error.message if it is a JSON envelope
    let message = detail.slice(0, 200);
    try {
      const parsed = JSON.parse(detail) as { error?: { message?: string } };
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {
      // not JSON, use raw snippet
    }
    return NextResponse.json(
      { error: `Transcripción falló (${res.status}): ${message}` },
      { status: 502 },
    );
  }

  const json = (await res.json().catch(() => ({}))) as { text?: string };
  return NextResponse.json({ text: (json.text ?? "").trim() });
}
