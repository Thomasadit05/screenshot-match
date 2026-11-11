import { Inbox, RefreshCw, ServerCrash, WifiOff, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-input bg-surface/60 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="mb-3 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="font-display text-xl font-bold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  kind = "server",
  onRetry,
  retrying,
  className,
}: {
  kind?: "server" | "offline";
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  const offline = kind === "offline";
  const Icon = offline ? WifiOff : ServerCrash;
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-xl border border-danger/25 bg-danger-soft px-6 py-10 text-center",
        className,
      )}
    >
      <span className="mb-3 grid size-12 place-items-center rounded-full bg-surface text-danger-ink">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="font-display text-xl font-bold text-danger-ink">
        {offline ? "Koneksi terputus" : "Gagal memuat data"}
      </p>
      <p className="mt-1 max-w-sm text-sm text-danger-ink/90">
        {offline
          ? "Kami tidak bisa terhubung ke server. Periksa koneksi internet Anda."
          : "Server sedang mengalami gangguan (kode 500). Data antrean belum bisa ditampilkan."}
      </p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={cn(retrying && "animate-spin")} aria-hidden />
          {retrying ? "Mencoba lagi…" : "Coba lagi"}
        </Button>
      )}
    </div>
  );
}

export function OfflineBanner({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning-ink"
    >
      <span className="inline-flex items-center gap-2 font-medium">
        <WifiOff className="size-4" aria-hidden />
        Koneksi terputus. Menampilkan data terakhir yang tersimpan.
      </span>
      <Button size="sm" variant="outline" onClick={onRetry} disabled={retrying}>
        <RefreshCw className={cn(retrying && "animate-spin")} aria-hidden />
        {retrying ? "Menghubungkan…" : "Coba lagi"}
      </Button>
    </div>
  );
}

export function LoadingSkeleton({ variant = "cards", count = 3 }: { variant?: "cards" | "table" | "ticket"; count?: number }) {
  if (variant === "ticket") {
    return (
      <div className="surface-card space-y-4 p-6" aria-busy="true" aria-label="Memuat tiket">
        <Skeleton className="mx-auto h-4 w-32" />
        <Skeleton className="mx-auto h-20 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (variant === "table") {
    return (
      <div className="surface-card space-y-3 p-4" aria-busy="true" aria-label="Memuat tabel">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Memuat data">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-card space-y-3 p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
