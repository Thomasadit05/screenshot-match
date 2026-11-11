import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useFeed } from "@/lib/queue/feed";
import { formatTime } from "@/lib/queue/logic";
import { cn } from "@/lib/utils";
import { ErrorState, LoadingSkeleton, OfflineBanner } from "./States";

/** Shows skeleton / error / offline states from the shared live feed. */
export function FeedGate({ children, skeleton }: { children: ReactNode; skeleton?: ReactNode }) {
  const { status, retry, retrying } = useFeed();
  if (status === "loading") return <>{skeleton ?? <LoadingSkeleton />}</>;
  if (status === "error") return <ErrorState kind="server" onRetry={retry} retrying={retrying} />;
  return (
    <>
      {status === "offline" && (
        <div className="mb-4">
          <OfflineBanner onRetry={retry} retrying={retrying} />
        </div>
      )}
      {children}
    </>
  );
}

export function LastUpdated({ className, dark }: { className?: string; dark?: boolean }) {
  const { lastUpdated, status } = useFeed();
  if (!lastUpdated) return null;
  return (
    <p
      className={cn("inline-flex items-center gap-1.5 text-xs", dark ? "text-cream/60" : "text-muted-foreground", className)}
      aria-live="polite"
    >
      <RefreshCw className={cn("size-3", status === "ready" && "text-success")} aria-hidden />
      Diperbarui {formatTime(lastUpdated, true)} WIB · otomatis tiap 5 detik
    </p>
  );
}
