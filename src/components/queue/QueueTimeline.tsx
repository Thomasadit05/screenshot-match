import { Ban, Check, CircleSlash, UserX } from "lucide-react";
import { formatTime } from "@/lib/queue/logic";
import type { Booking } from "@/lib/queue/types";
import { cn } from "@/lib/utils";

const STEPS = ["DP Dibayar", "Menunggu", "Dipanggil", "Sedang Dilayani", "Selesai"] as const;

function reachedIndex(b: Booking): number {
  if (b.status === "completed") return 4;
  if (b.status === "in_service" || b.startedAt) return 3;
  if (b.calledAt) return 2;
  if (b.payment.paidAt) return 1;
  return -1;
}

export function QueueTimeline({ booking }: { booking: Booking }) {
  const reached = reachedIndex(booking);
  const terminal =
    booking.status === "cancelled"
      ? { label: "Dibatalkan", icon: Ban, at: booking.cancelledAt }
      : booking.status === "no_show"
        ? { label: "Tidak Hadir", icon: UserX, at: booking.noShowAt }
        : booking.status === "payment_expired"
          ? { label: booking.payment.status === "failed" ? "Pembayaran Gagal" : "Pembayaran Kedaluwarsa", icon: CircleSlash, at: booking.payment.expiresAt }
          : null;

  const times = [
    booking.payment.paidAt,
    booking.queuedAt,
    booking.calledAt,
    booking.startedAt,
    booking.completedAt,
  ];

  return (
    <ol className="relative space-y-0" aria-label="Status antrean">
      {STEPS.map((label, i) => {
        if (terminal && i > reached) return null;
        const done = i < reached || (i === reached && (booking.status === "completed" || terminal !== null));
        const current = i === reached && !done;
        return (
          <li key={label} className="relative flex gap-3 pb-5 last:pb-0" aria-current={current ? "step" : undefined}>
            {(i < STEPS.length - 1 && !(terminal && i === reached)) || (terminal && i === reached) ? (
              <span
                className={cn("absolute top-7 left-[13px] h-[calc(100%-1.5rem)] w-0.5", done ? "bg-success" : "bg-border")}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold",
                done && "border-success bg-success text-success-foreground",
                current && "border-bronze bg-bronze-soft text-bronze-ink animate-pulse-ring",
                !done && !current && "border-border bg-surface text-muted-foreground",
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={cn("text-sm font-semibold", !done && !current && "text-muted-foreground")}>
                {label}
                {current && <span className="ml-2 text-xs font-medium text-bronze-ink">(saat ini)</span>}
              </p>
              {times[i] && (done || current) && (
                <p className="text-xs text-muted-foreground tabular">{formatTime(times[i]!)} WIB</p>
              )}
            </div>
          </li>
        );
      })}
      {terminal && (
        <li className="relative flex gap-3">
          <span className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 border-danger bg-danger-soft text-danger-ink">
            <terminal.icon className="size-4" aria-hidden />
          </span>
          <div className="pt-0.5">
            <p className="text-sm font-semibold text-danger-ink">{terminal.label}</p>
            {terminal.at && <p className="text-xs text-muted-foreground tabular">{formatTime(terminal.at)} WIB</p>}
          </div>
        </li>
      )}
    </ol>
  );
}
