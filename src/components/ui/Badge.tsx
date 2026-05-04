import { cn } from "@/lib/utils/cn";
import type { Priority, TaskStatus } from "@/types/database";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "muted";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-foreground border-border",
  info: "bg-blue-50 text-blue-700 border-blue-100",
  success: "bg-emerald-50 text-emerald-700 border-emerald-100",
  warning: "bg-amber-50 text-amber-700 border-amber-100",
  danger: "bg-rose-50 text-rose-700 border-rose-100",
  muted: "bg-muted/60 text-muted-foreground border-border",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function priorityTone(p: Priority): Tone {
  switch (p) {
    case "urgent":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "info";
    case "low":
    default:
      return "muted";
  }
}

export function taskStatusTone(s: TaskStatus): Tone {
  switch (s) {
    case "done":
      return "success";
    case "in_progress":
      return "info";
    case "blocked":
      return "danger";
    case "pending":
    default:
      return "neutral";
  }
}
