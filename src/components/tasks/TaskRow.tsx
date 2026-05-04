"use client";

import { useState } from "react";
import { Calendar, Tag } from "lucide-react";
import { Badge, priorityTone, taskStatusTone } from "@/components/ui/Badge";
import { PRIORITIES, TASK_STATUSES } from "@/types/app";
import { smartDateLabel } from "@/lib/utils/dates";
import type { Client, Project, Task } from "@/types/database";
import { updateTask } from "@/lib/repositories/tasks";
import { useToast } from "@/components/ui/Toast";

export function TaskRow({
  task,
  clients,
  projects,
  onChanged,
  onClick,
}: {
  task: Task;
  clients: Client[];
  projects: Project[];
  onChanged: (t: Task) => void;
  onClick: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const client = clients.find((c) => c.id === task.client_id);
  const project = projects.find((p) => p.id === task.project_id);
  const priorityLabel = PRIORITIES.find((p) => p.value === task.priority)?.label ?? task.priority;
  const statusLabel = TASK_STATUSES.find((s) => s.value === task.status)?.label ?? task.status;

  async function onToggleDone(e: React.ChangeEvent<HTMLInputElement>) {
    if (busy) return;
    setBusy(true);
    const next = e.target.checked ? "done" : "pending";
    try {
      const updated = await updateTask(task.id, { status: next });
      onChanged(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const overdue =
    task.due_date && task.status !== "done"
      ? new Date(task.due_date).getTime() < Date.now()
      : false;

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      onClick={onClick}
      className="group flex items-start gap-3 px-3 sm:px-4 py-3 border-b border-border bg-white hover:bg-muted/40 cursor-pointer"
    >
      <input
        type="checkbox"
        checked={task.status === "done"}
        onChange={onToggleDone}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 mt-1 rounded border-border shrink-0"
        aria-label={`Marcar ${task.title} como hecha`}
        disabled={busy}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm font-medium ${
              task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {task.title}
          </span>
          <Badge tone={priorityTone(task.priority)}>{priorityLabel}</Badge>
          <Badge tone={taskStatusTone(task.status)}>{statusLabel}</Badge>
          {overdue ? <Badge tone="danger">Atrasada</Badge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
          {task.due_date ? (
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} />
              {smartDateLabel(task.due_date)}
            </span>
          ) : null}
          {client ? <span>· {client.name}</span> : null}
          {project ? <span>· {project.name}</span> : null}
          {task.tags?.length ? (
            <span className="inline-flex items-center gap-1">
              <Tag size={12} />
              {task.tags.join(", ")}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
