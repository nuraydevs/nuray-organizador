"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Inbox as InboxIcon, FileText, Mic, Check, Trash2, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useQuickAdd } from "@/components/quick-add/QuickAddProvider";
import {
  deleteQuickCapture,
  listQuickCaptures,
  markQuickCapturePending,
  markQuickCaptureProcessed,
} from "@/lib/repositories/quickCaptures";
import type { QuickCapture, QuickCaptureStatus } from "@/types/database";
import { smartDateLabel } from "@/lib/utils/dates";

type Tab = QuickCaptureStatus | "all";

const TABS: { value: Tab; label: string }[] = [
  { value: "pending", label: "Pendientes" },
  { value: "processed", label: "Procesadas" },
  { value: "all", label: "Todas" },
];

export default function InboxPage() {
  const toast = useToast();
  const quickAdd = useQuickAdd();
  const [captures, setCaptures] = useState<QuickCapture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listQuickCaptures();
      setCaptures(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function refresh() {
      load();
    }
    window.addEventListener("nuray:quick-add:created", refresh);
    return () => window.removeEventListener("nuray:quick-add:created", refresh);
  }, [load]);

  const filtered = useMemo(() => {
    if (tab === "all") return captures;
    return captures.filter((c) => c.status === tab);
  }, [captures, tab]);

  async function onMarkProcessed(c: QuickCapture) {
    try {
      const updated = await markQuickCaptureProcessed(c.id);
      setCaptures((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
      toast.success("Marcada como procesada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function onMarkPending(c: QuickCapture) {
    try {
      const updated = await markQuickCapturePending(c.id);
      setCaptures((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
      toast.success("Devuelta a pendientes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function onDelete(c: QuickCapture) {
    try {
      const res = await deleteQuickCapture(c);
      setCaptures((prev) => prev.filter((x) => x.id !== c.id));
      setConfirmDel(null);
      if (res.storageWarning) {
        toast.info(`Captura eliminada. Aviso de Storage: ${res.storageWarning}`);
      } else {
        toast.success("Captura eliminada");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Capturas rápidas para organizar después."
        actions={
          <Button onClick={() => quickAdd.open()}>
            <Plus size={14} /> Nueva captura
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1 mb-3">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`h-8 px-3 rounded-md text-xs ${
              tab === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-white border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <EmptyState
          title="Error al cargar"
          description={error}
          action={<Button onClick={load}>Reintentar</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<InboxIcon size={20} />}
          title={
            tab === "pending"
              ? "Sin capturas pendientes"
              : tab === "processed"
              ? "Sin capturas procesadas"
              : "Inbox vacío"
          }
          description="Guarda ideas rápidas desde Añadir rápido."
          action={
            <Button onClick={() => quickAdd.open()}>
              <Plus size={14} /> Nueva captura
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-border bg-white p-3 sm:p-4"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                  {c.type === "audio" ? <Mic size={14} /> : <FileText size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={c.type === "audio" ? "info" : "muted"}>
                      {c.type === "audio" ? "Audio" : "Texto"}
                    </Badge>
                    <Badge
                      tone={c.status === "processed" ? "success" : "warning"}
                    >
                      {c.status === "processed" ? "Procesada" : "Pendiente"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {smartDateLabel(c.created_at)}
                    </span>
                  </div>

                  {c.type === "text" && c.content ? (
                    <p className="text-sm whitespace-pre-wrap mt-2 break-words">
                      {c.content}
                    </p>
                  ) : null}

                  {c.type === "audio" && c.audio_url ? (
                    <div className="mt-2">
                      <audio
                        src={c.audio_url}
                        controls
                        preload="none"
                        className="w-full"
                      />
                      {c.content ? (
                        <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap">
                          {c.content}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 justify-end border-t border-border pt-3">
                {c.status === "pending" ? (
                  <Button size="sm" variant="outline" onClick={() => onMarkProcessed(c)}>
                    <Check size={14} /> Marcar procesada
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => onMarkPending(c)}>
                    <Undo2 size={14} /> Devolver a pendiente
                  </Button>
                )}
                {confirmDel === c.id ? (
                  <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    ¿Borrar?
                    <button
                      type="button"
                      onClick={() => onDelete(c)}
                      className="h-8 px-3 rounded-md bg-destructive text-destructive-foreground"
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDel(null)}
                      className="h-8 px-3 rounded-md border border-border"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDel(c.id)}
                    className="text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={14} /> Eliminar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
