import { cn } from "@/lib/utils/cn";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground truncate">
          {title}
        </h1>
        {description ? (
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2 flex-wrap">{actions}</div>
      ) : null}
    </header>
  );
}
