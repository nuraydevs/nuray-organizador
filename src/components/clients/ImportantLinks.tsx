"use client";

import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Client, ImportantLink } from "@/types/database";
import { updateClient } from "@/lib/repositories/clients";
import { useToast } from "@/components/ui/Toast";

export function ImportantLinks({
  client,
  onUpdated,
}: {
  client: Client;
  onUpdated: (c: Client) => void;
}) {
  const toast = useToast();
  const links = client.important_links ?? [];
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(next: ImportantLink[]) {
    setBusy(true);
    try {
      const updated = await updateClient(client.id, { important_links: next });
      onUpdated(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function onAdd() {
    if (!label.trim() || !url.trim() || busy) return;
    const next = [...links, { label: label.trim(), url: url.trim() }];
    await save(next);
    setLabel("");
    setUrl("");
  }

  async function onRemove(index: number) {
    const next = links.filter((_, i) => i !== index);
    await save(next);
  }

  return (
    <div>
      {links.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin enlaces.</p>
      ) : (
        <ul className="space-y-1.5">
          {links.map((l, i) => (
            <li
              key={`${l.url}-${i}`}
              className="flex items-center gap-2 group text-sm"
            >
              <ExternalLink size={14} className="text-muted-foreground" />
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-foreground hover:underline truncate flex-1"
              >
                {l.label}
              </a>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="opacity-50 hover:opacity-100 text-muted-foreground"
                aria-label="Eliminar enlace"
                disabled={busy}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Etiqueta"
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          inputMode="url"
        />
        <Button
          type="button"
          variant="outline"
          onClick={onAdd}
          loading={busy}
          disabled={!label.trim() || !url.trim()}
        >
          <Plus size={14} /> Añadir
        </Button>
      </div>
    </div>
  );
}
