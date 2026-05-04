import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { QuickCapture, QuickCaptureStatus } from "@/types/database";

const TABLE = "quick_captures";
const BUCKET = "quick-captures";
const DEFAULT_LIMIT = 100;

export async function listQuickCaptures(
  status?: QuickCaptureStatus,
): Promise<QuickCapture[]> {
  const sb = getSupabaseBrowser();
  let q = sb
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(DEFAULT_LIMIT);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as QuickCapture[];
}

export async function createTextCapture(content: string): Promise<QuickCapture> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .insert({
      type: "text",
      content: content.trim(),
      status: "pending",
      source: "quick_add",
    })
    .select()
    .single();
  if (error) throw error;
  return data as QuickCapture;
}

export async function createAudioCapture(input: {
  audioUrl: string;
  audioPath: string;
  content?: string | null;
}): Promise<QuickCapture> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .insert({
      type: "audio",
      audio_url: input.audioUrl,
      audio_path: input.audioPath,
      content: input.content?.trim() || null,
      status: "pending",
      source: "quick_add",
    })
    .select()
    .single();
  if (error) throw error;
  return data as QuickCapture;
}

export async function markQuickCaptureProcessed(id: string): Promise<QuickCapture> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .update({ status: "processed" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as QuickCapture;
}

export async function markQuickCapturePending(id: string): Promise<QuickCapture> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from(TABLE)
    .update({ status: "pending" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as QuickCapture;
}

/**
 * Deletes the row and, if it was an audio capture, attempts to delete the
 * Storage object as well. Storage failures are reported via a non-blocking
 * `storageWarning` field rather than thrown, so the row deletion still
 * succeeds even if the underlying file is gone or unreachable.
 */
export async function deleteQuickCapture(
  capture: Pick<QuickCapture, "id" | "audio_path" | "type">,
): Promise<{ ok: true; storageWarning?: string }> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.from(TABLE).delete().eq("id", capture.id);
  if (error) throw error;

  if (capture.type === "audio" && capture.audio_path) {
    const { error: storageError } = await sb.storage
      .from(BUCKET)
      .remove([capture.audio_path]);
    if (storageError) {
      return {
        ok: true,
        storageWarning: storageError.message,
      };
    }
  }
  return { ok: true };
}

/**
 * Uploads an audio blob to the quick-captures bucket and returns both
 * the storage path (for later deletion) and a public URL (for playback).
 */
export async function uploadAudioBlob(blob: Blob): Promise<{
  audioPath: string;
  audioUrl: string;
}> {
  const sb = getSupabaseBrowser();
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ts = now.getTime();
  const rand = Math.random().toString(36).slice(2, 8);
  const ext = blob.type.includes("ogg")
    ? "ogg"
    : blob.type.includes("mp4")
    ? "mp4"
    : "webm";
  const filename = `quick_capture_${ts}_${rand}.${ext}`;
  const path = `${yyyy}/${mm}/${filename}`;

  const { error } = await sb.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || "audio/webm",
    upsert: false,
  });
  if (error) throw error;

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { audioPath: path, audioUrl: data.publicUrl };
}
