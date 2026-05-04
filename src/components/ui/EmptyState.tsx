import { cn } from "@/lib/utils/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 rounded-lg border border-dashed border-border bg-muted/30",
        className,
      )}
    >
      {icon ? <div className="text-muted-foreground mb-3">{icon}</div> : null}
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {description ? (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
