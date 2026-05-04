import { cn } from "@/lib/utils/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground",
        className,
      )}
      aria-label="Cargando"
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Spinner />
      <span className="ml-2 text-sm">Cargando...</span>
    </div>
  );
}
