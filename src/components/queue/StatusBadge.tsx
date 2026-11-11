import {
  AlertTriangle,
  Ban,
  BellRing,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Clock,
  Hourglass,
  Lock,
  RotateCcw,
  Scissors,
  Store,
  UserCheck,
  UserX,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingStatus, CapsterDisplayStatus, PaymentStatus } from "@/lib/queue/types";

type Tone = "success" | "warning" | "danger" | "bronze" | "neutral" | "info" | "dark";

const toneClass: Record<Tone, string> = {
  success: "bg-success-soft text-success-ink border-success/25",
  warning: "bg-warning-soft text-warning-ink border-warning/30",
  danger: "bg-danger-soft text-danger-ink border-danger/25",
  bronze: "bg-bronze-soft text-bronze-ink border-bronze/30",
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-info-soft text-info-ink border-info-ink/20",
  dark: "bg-charcoal text-cream border-charcoal",
};

interface Def {
  label: string;
  tone: Tone;
  icon: LucideIcon;
}

export type BookingBadgeValue = BookingStatus | "called";

const BOOKING: Record<BookingBadgeValue, Def> = {
  payment_pending: { label: "Menunggu Pembayaran", tone: "warning", icon: Hourglass },
  waiting: { label: "Menunggu", tone: "info", icon: Clock },
  called: { label: "Dipanggil", tone: "bronze", icon: BellRing },
  in_service: { label: "Sedang Dilayani", tone: "dark", icon: Scissors },
  completed: { label: "Selesai", tone: "success", icon: CheckCircle2 },
  cancelled: { label: "Dibatalkan", tone: "neutral", icon: Ban },
  no_show: { label: "Tidak Hadir", tone: "danger", icon: UserX },
  payment_expired: { label: "Pembayaran Kedaluwarsa", tone: "neutral", icon: CircleSlash },
};

const PAYMENT: Record<PaymentStatus, Def> = {
  pending: { label: "Pending", tone: "warning", icon: Hourglass },
  paid: { label: "Lunas DP", tone: "success", icon: CheckCircle2 },
  expired: { label: "Kedaluwarsa", tone: "neutral", icon: CircleSlash },
  failed: { label: "Gagal", tone: "danger", icon: XCircle },
  refund_pending: { label: "Refund Diproses", tone: "warning", icon: RotateCcw },
  refunded: { label: "Refund Selesai", tone: "info", icon: RotateCcw },
};

const CAPSTER: Record<CapsterDisplayStatus, Def> = {
  inactive: { label: "Belum Aktif", tone: "neutral", icon: CircleDashed },
  available: { label: "Tersedia", tone: "success", icon: UserCheck },
  serving: { label: "Sedang Melayani", tone: "dark", icon: Scissors },
  queued: { label: "Ada Antrean", tone: "info", icon: Clock },
  full: { label: "Antrean Penuh", tone: "danger", icon: AlertTriangle },
  finished: { label: "Selesai Kerja", tone: "neutral", icon: Lock },
};

type Props =
  | { kind: "booking"; value: BookingBadgeValue }
  | { kind: "payment"; value: PaymentStatus }
  | { kind: "capster"; value: CapsterDisplayStatus }
  | { kind: "shop"; value: boolean };

export function StatusBadge(props: Props & { className?: string; size?: "sm" | "md" }) {
  let def: Def;
  if (props.kind === "booking") def = BOOKING[props.value];
  else if (props.kind === "payment") def = PAYMENT[props.value];
  else if (props.kind === "capster") def = CAPSTER[props.value];
  else
    def = props.value
      ? { label: "Toko Buka", tone: "success", icon: Store }
      : { label: "Toko Tutup", tone: "danger", icon: Lock };
  const Icon = def.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap",
        props.size === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs",
        toneClass[def.tone],
        props.className,
      )}
    >
      <Icon className={props.size === "md" ? "size-4" : "size-3.5"} aria-hidden />
      {def.label}
    </span>
  );
}

export function bookingBadgeValue(b: { status: BookingStatus; calledAt: number | null }): BookingBadgeValue {
  return b.status === "waiting" && b.calledAt !== null ? "called" : b.status;
}
