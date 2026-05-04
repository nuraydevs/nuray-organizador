"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Phase = "idle" | "recording" | "stopped" | "error";

interface AudioRecorderProps {
  onReady: (blob: Blob, durationMs: number) => void;
  /** Called when the recorder is reset (e.g. user clicks "Repetir"). */
  onReset?: () => void;
  disabled?: boolean;
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function AudioRecorder({ onReady, onReset, disabled }: AudioRecorderProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const supported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    return () => {
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    if (disabled || phase === "recording") return;
    setError(null);
    if (!supported) {
      setError("Tu navegador no permite grabar audio aquí. Usa captura de texto.");
      setPhase("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        const dur = Date.now() - startedAtRef.current;
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        setBlobUrl(URL.createObjectURL(blob));
        setPhase("stopped");
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (tickRef.current !== null) {
          window.clearInterval(tickRef.current);
          tickRef.current = null;
        }
        onReady(blob, dur);
      };
      startedAtRef.current = Date.now();
      setElapsed(0);
      rec.start();
      setPhase("recording");
      tickRef.current = window.setInterval(() => {
        setElapsed(Date.now() - startedAtRef.current);
      }, 250);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "No se pudo acceder al micrófono.";
      setError(msg);
      setPhase("error");
    }
  }

  function stop() {
    if (phase !== "recording") return;
    mediaRecorderRef.current?.stop();
  }

  function reset() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setElapsed(0);
    setError(null);
    setPhase("idle");
    onReset?.();
  }

  if (!supported && phase !== "error") {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
        Tu navegador no permite grabar audio aquí. Usa captura de texto.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {error}
        </div>
      ) : null}

      {phase === "idle" || phase === "error" ? (
        <Button
          type="button"
          onClick={start}
          disabled={disabled}
          className="w-full h-12 text-sm"
        >
          <Mic size={18} />
          Grabar
        </Button>
      ) : null}

      {phase === "recording" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-3 text-rose-800">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-600 animate-pulse" />
            <span className="text-sm font-medium">Grabando · {fmt(elapsed)}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={stop}
            className="w-full h-12 text-sm"
          >
            <Square size={16} />
            Detener
          </Button>
        </div>
      ) : null}

      {phase === "stopped" && blobUrl ? (
        <div className="space-y-2">
          <div className="rounded-md border border-border bg-muted/40 p-2">
            <audio src={blobUrl} controls className="w-full" />
            <div className="text-[11px] text-muted-foreground mt-1 text-center">
              Duración: {fmt(elapsed)}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={reset}
            className="w-full h-10 text-sm"
          >
            <RotateCcw size={14} />
            Repetir
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function AudioUploadIndicator({ uploading }: { uploading: boolean }) {
  if (!uploading) return null;
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <Loader2 size={14} className="animate-spin" /> Subiendo audio...
    </div>
  );
}
