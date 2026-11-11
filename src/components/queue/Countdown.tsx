import { useEffect, useRef } from "react";
import { useNow } from "@/lib/queue/feed";
import { cn } from "@/lib/utils";

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  until: number;
  label?: string;
  onExpire?: () => void;
  className?: string;
  /** Turns amber/red as time runs out. */
  warnBelowMs?: number;
  size?: "sm" | "lg";
}

export function Countdown({ until, label, onExpire, className, warnBelowMs = 60_000, size = "sm" }: Props) {
  const now = useNow(1000);
  const left = until - now;
  const fired = useRef(false);

  useEffect(() => {
    if (left <= 0 && !fired.current) {
      fired.current = true;
      onExpire?.();
    }
    if (left > 0) fired.current = false;
  }, [left, onExpire]);

  const tone = left <= 0 ? "text-danger-ink" : left < warnBelowMs ? "text-warning-ink" : "text-foreground";
  return (
    <span className={cn("inline-flex flex-col", className)}>
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      <span
        className={cn("font-display font-bold tabular", size === "lg" ? "text-4xl" : "text-xl", tone)}
        role="timer"
        aria-live="off"
        aria-label={`${label ?? "Sisa waktu"} ${formatDuration(left)}`}
      >
        {formatDuration(left)}
      </span>
    </span>
  );
}
