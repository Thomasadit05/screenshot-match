import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, CircleSlash, Clock, RotateCcw, Scissors, Ticket, UserX, Users, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/queue/ConfirmationDialog";
import { Countdown } from "@/components/queue/Countdown";
import { FeedGate, LastUpdated } from "@/components/queue/FeedGate";
import { PaymentStatus } from "@/components/queue/PaymentStatus";
import { PublicHeader } from "@/components/queue/PublicHeader";
import { QueueTimeline } from "@/components/queue/QueueTimeline";
import { EmptyState, LoadingSkeleton } from "@/components/queue/States";
import { StatusBadge, bookingBadgeValue } from "@/components/queue/StatusBadge";
import { notify } from "@/components/queue/ToastNotification";
import { cancelByCustomer } from "@/lib/queue/api";
import { DP_AMOUNT, REMAINING_AMOUNT, SERVICE } from "@/lib/queue/config";
import { useNow, useQueueData } from "@/lib/queue/feed";
import { formatRupiah, formatTime, isCalled, positionOf, remainingServiceMinutes, toleranceEndsAt } from "@/lib/queue/logic";
import type { Booking } from "@/lib/queue/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tiket/$bookingId")({
  head: () => ({
    meta: [
      { title: "Tiket Antrean — Cukur Rapi Barbershop" },
      { name: "description", content: "Pantau nomor antrean, posisi, dan estimasi giliran potong rambut Anda." },
      { property: "og:title", content: "Tiket Antrean — Cukur Rapi Barbershop" },
      { property: "og:description", content: "Nomor antrean, posisi, dan estimasi giliran Anda diperbarui otomatis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TicketPage,
});

function TicketPage() {
  const { bookingId } = Route.useParams();
  const state = useQueueData();
  const booking = state.bookings.find((b) => b.id === bookingId);

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-lg px-4 pt-6 pb-24">
        <FeedGate skeleton={<LoadingSkeleton variant="ticket" />}>
          {!booking ? (
            <EmptyState
              icon={Ticket}
              title="Tiket tidak ditemukan"
              description="Tiket ini tidak ada atau sudah tidak berlaku untuk hari ini."
              action={
                <Link to="/" className={buttonVariants()}>
                  Ke Beranda
                </Link>
              }
            />
          ) : (
            <TicketView booking={booking} />
          )}
        </FeedGate>
      </main>
    </div>
  );
}

function TicketView({ booking }: { booking: Booking }) {
  const state = useQueueData();
  const now = useNow(1000);
  const capster = state.capsters.find((c) => c.id === booking.capsterId);
  const { ahead, etaMinutes } = positionOf(state, booking, now);
  const called = isCalled(booking);
  const badge = bookingBadgeValue(booking);
  const pay = booking.payment.status;

  if (booking.status === "payment_pending") {
    return (
      <EmptyState
        icon={Wallet}
        title="Pembayaran DP belum selesai"
        description="Nomor antrean baru terbit setelah DP terverifikasi."
        action={
          <Link to="/bayar/$bookingId" params={{ bookingId: booking.id }} className={buttonVariants({ variant: "bronze", size: "lg" })}>
            Lanjutkan Pembayaran
          </Link>
        }
      />
    );
  }

  const ended = ["completed", "cancelled", "no_show", "payment_expired"].includes(booking.status);

  return (
    <div className="space-y-4">
      <article
        aria-label="Tiket antrean"
        className={cn(
          "overflow-hidden rounded-2xl border shadow-lift",
          booking.status === "in_service" || called ? "border-charcoal bg-charcoal text-cream" : "border-border bg-surface",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-5">
          <p className={cn("text-xs font-semibold tracking-widest uppercase", booking.status === "in_service" || called ? "text-bronze" : "text-bronze-ink")}>
            Nomor antrean
          </p>
          <StatusBadge kind="booking" value={badge} size="md" />
        </div>
        <p className="px-5 font-display text-8xl leading-none font-extrabold tabular sm:text-9xl">
          {booking.queueNumber ?? "—"}
        </p>
        <div className={cn("mt-4 grid grid-cols-3 border-t text-center", booking.status === "in_service" || called ? "border-charcoal-3" : "border-border")}>
          <Stat label="Capster" value={capster?.name ?? "-"} />
          <Stat label="Di depan Anda" value={booking.status === "waiting" ? `${ahead} orang` : "—"} />
          <Stat label="Estimasi" value={booking.status === "waiting" ? (etaMinutes > 0 ? `±${etaMinutes} mnt` : "Segera") : "—"} />
        </div>
      </article>

      {called && (
        <section role="alert" className="rounded-xl border-2 border-bronze bg-bronze-soft p-4">
          <div className="flex items-start gap-3">
            <BellRing className="mt-1 size-6 shrink-0 animate-pulse text-bronze-ink" aria-hidden />
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Giliran Anda! Silakan menuju kursi {capster?.name}</h2>
              <p className="text-sm text-muted-foreground">
                Hadir sebelum waktu toleransi habis. Setelah itu capster dapat menandai Anda tidak hadir dan DP hangus.
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-center">
            <Countdown until={toleranceEndsAt(booking) ?? now} label="Sisa toleransi hadir" size="lg" warnBelowMs={120_000} />
          </div>
        </section>
      )}

      {booking.status === "waiting" && !called && (
        <section className="surface-card flex items-start gap-3 p-4">
          <Users className="mt-0.5 size-5 shrink-0 text-bronze-ink" aria-hidden />
          <p className="text-sm">
            {ahead === 0
              ? "Anda berikutnya. Mohon sudah berada di toko."
              : `Masih ada ${ahead} pelanggan sebelum Anda. Estimasi bisa berubah mengikuti lama pelayanan.`}
          </p>
        </section>
      )}

      {booking.status === "in_service" && (
        <section className="surface-card flex items-start gap-3 p-4">
          <Scissors className="mt-0.5 size-5 shrink-0 text-bronze-ink" aria-hidden />
          <p className="text-sm">
            Kursi {capster?.name} sedang digunakan untuk Anda. Perkiraan selesai ±{remainingServiceMinutes(booking, now)} menit lagi.
            Siapkan sisa pembayaran {formatRupiah(REMAINING_AMOUNT)}.
          </p>
        </section>
      )}

      {booking.status === "completed" && (
        <section className="rounded-xl border border-success/30 bg-success-soft p-4 text-success-ink">
          <h2 className="text-2xl font-bold">Terima kasih, {booking.customerName}!</h2>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
            <dt>Layanan</dt>
            <dd className="text-right font-medium">{SERVICE.name}</dd>
            <dt>Capster</dt>
            <dd className="text-right font-medium">{capster?.name}</dd>
            <dt>Mulai – selesai</dt>
            <dd className="text-right font-medium tabular">
              {booking.startedAt ? formatTime(booking.startedAt) : "-"} – {booking.completedAt ? formatTime(booking.completedAt) : "-"} WIB
            </dd>
            <dt>DP online</dt>
            <dd className="text-right font-medium tabular">{formatRupiah(DP_AMOUNT)}</dd>
            <dt>Dibayar di toko</dt>
            <dd className="text-right font-medium tabular">{formatRupiah(REMAINING_AMOUNT)}</dd>
            <dt className="font-bold">Total</dt>
            <dd className="text-right font-bold tabular">{formatRupiah(SERVICE.price)}</dd>
          </dl>
        </section>
      )}

      {booking.status === "cancelled" && (
        <EndNotice
          icon={pay === "paid" ? CircleSlash : RotateCcw}
          title={
            pay === "refund_pending" ? "Dibatalkan — refund sedang diproses" : pay === "refunded" ? "Dibatalkan — DP sudah dikembalikan" : "Booking dibatalkan"
          }
          text={
            pay === "refund_pending"
              ? `Booking dibatalkan oleh barbershop. DP ${formatRupiah(DP_AMOUNT)} akan dikembalikan ke metode pembayaran Anda dalam 1–3 hari kerja.`
              : pay === "refunded"
                ? `DP ${formatRupiah(DP_AMOUNT)} sudah dikembalikan ke metode pembayaran asal.`
                : "Anda membatalkan booking ini. Sesuai kebijakan, DP tidak dikembalikan."
          }
        />
      )}
      {booking.status === "no_show" && (
        <EndNotice icon={UserX} title="Tidak hadir" text="Anda tidak hadir dalam 5 menit setelah dipanggil. Nomor antrean dilewati dan DP hangus." />
      )}
      {booking.status === "payment_expired" && (
        <EndNotice
          icon={CircleSlash}
          title={pay === "failed" ? "Pembayaran gagal" : "Pembayaran kedaluwarsa"}
          text="Slot antrean dilepas dan tidak ada dana yang ditarik."
        />
      )}

      <section className="surface-card p-4 sm:p-5">
        <h2 className="mb-3 text-xl font-bold">Status antrean</h2>
        <QueueTimeline booking={booking} />
      </section>

      <section className="surface-card flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2 text-sm">
          <Wallet className="size-5 text-bronze-ink" aria-hidden />
          Sisa pembayaran di toko
        </div>
        <p className="font-display text-2xl font-bold tabular">
          {booking.status === "completed" ? "Lunas" : formatRupiah(REMAINING_AMOUNT)}
        </p>
      </section>

      <PaymentStatus payment={booking.payment} />

      <div className="flex flex-col items-center gap-3 pt-2">
        {booking.status === "waiting" && !called && (
          <ConfirmationDialog
            trigger={
              <button type="button" className={cn(buttonVariants({ variant: "destructive-outline", size: "lg" }), "w-full")}>
                Batalkan Booking
              </button>
            }
            tone="danger"
            title="Batalkan booking ini?"
            description={`Nomor ${booking.queueNumber} akan dilepas dan DP ${formatRupiah(DP_AMOUNT)} tidak dikembalikan sesuai kebijakan.`}
            confirmLabel="Ya, batalkan"
            cancelLabel="Tidak jadi"
            onConfirm={() => cancelByCustomer(booking.id)}
            onDone={() => notify.success("Booking dibatalkan", "Terima kasih sudah memberi tahu kami.")}
          />
        )}
        {ended && (
          <Link to="/" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            Ambil antrean baru
          </Link>
        )}
        <LastUpdated />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" aria-hidden />
          Simpan halaman ini untuk memantau giliran Anda.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-inherit px-2 py-3 last:border-r-0">
      <p className="text-[0.7rem] opacity-70">{label}</p>
      <p className="font-display text-xl font-bold tabular">{value}</p>
    </div>
  );
}

function EndNotice({ icon: Icon, title, text }: { icon: typeof UserX; title: string; text: string }) {
  return (
    <section role="status" className="flex items-start gap-3 rounded-xl border border-border bg-muted p-4">
      <Icon className="mt-0.5 size-6 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </section>
  );
}
