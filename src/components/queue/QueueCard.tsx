import type { ReactNode } from "react";
import { maskPhone } from "@/lib/queue/logic";
import type { Booking } from "@/lib/queue/types";
import { cn } from "@/lib/utils";
import { StatusBadge, bookingBadgeValue } from "./StatusBadge";

interface Props {
  booking: Booking;
  variant?: "current" | "next" | "row";
  eyebrow?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  showPhone?: boolean;
}

export function QueueCard({ booking, variant = "row", eyebrow, meta, actions, showPhone = true }: Props) {
  const big = variant === "current";
  return (
    <article
      className={cn(
        "rounded-xl border p-4",
        variant === "current" && "border-charcoal bg-charcoal text-cream shadow-lift sm:p-6",
        variant === "next" && "border-bronze/40 bg-surface shadow-soft sm:p-5",
        variant === "row" && "border-border bg-surface",
      )}
    >
      {eyebrow && (
        <p className={cn("mb-2 text-xs font-semibold tracking-wider uppercase", big ? "text-bronze" : "text-bronze-ink")}>
          {eyebrow}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className={cn("font-display font-bold tabular leading-none", big ? "text-6xl" : variant === "next" ? "text-4xl" : "text-3xl")}>
          {booking.queueNumber ?? "—"}
        </p>
        <div className="min-w-[7.5rem] flex-1">
          <p className={cn("font-semibold break-words", big ? "text-xl" : "text-base")}>{booking.customerName}</p>
          {showPhone && (
            <p className={cn("text-sm tabular", big ? "text-cream/70" : "text-muted-foreground")}>{maskPhone(booking.phone)}</p>
          )}
        </div>
        <StatusBadge
          kind="booking"
          value={bookingBadgeValue(booking)}
          size={big ? "md" : "sm"}
          className={cn(big && booking.status === "in_service" && "border-bronze bg-bronze text-charcoal")}
        />
      </div>
      {meta && <div className={cn("mt-3 text-sm", big ? "text-cream/80" : "text-muted-foreground")}>{meta}</div>}
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}
