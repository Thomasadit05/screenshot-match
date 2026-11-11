import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Clock3,
  CreditCard,
  FlaskConical,
  Hourglass,
  Loader2,
  ServerCog,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Countdown } from "@/components/queue/Countdown";
import { FeedGate } from "@/components/queue/FeedGate";
import { PublicHeader } from "@/components/queue/PublicHeader";
import { EmptyState, LoadingSkeleton } from "@/components/queue/States";
import { StatusBadge } from "@/components/queue/StatusBadge";
import { notify } from "@/components/queue/ToastNotification";
import { expireStalePayments, simulatePayment, type PaymentOutcome } from "@/lib/queue/api";
import { REMAINING_AMOUNT } from "@/lib/queue/config";
import { useQueueData } from "@/lib/queue/feed";
import { formatRupiah } from "@/lib/queue/logic";
import type { Booking } from "@/lib/queue/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bayar/$bookingId")({
  head: () => ({
    meta: [
      { title: "Pembayaran DP — Cukur Rapi Barbershop" },
      { name: "description", content: "Simulasi pembayaran DP antrean melalui Midtrans Sandbox Demo." },
      { property: "og:title", content: "Pembayaran DP — Cukur Rapi Barbershop" },
      { property: "og:description", content: "Selesaikan DP Rp15.000 dalam 10 menit untuk mendapatkan nomor antrean." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentPage,
});

function PaymentPage() {
  const { bookingId } = Route.useParams();
  const state = useQueueData();
  const booking = state.bookings.find((b) => b.id === bookingId);
  const capster = booking ? state.capsters.find((c) => c.id === booking.capsterId) : undefined;

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-lg px-4 pt-6 pb-24">
        <FeedGate skeleton={<LoadingSkeleton variant="ticket" />}>
          {!booking ? (
            <EmptyState
              title="Pembayaran tidak ditemukan"
              description="Tautan pembayaran tidak valid atau sudah dihapus. Silakan buat booking baru."
              action={
                <Link to="/" className={buttonVariants()}>
                  Ke Beranda
                </Link>
              }
            />
          ) : (
            <PaymentPanel booking={booking} capsterName={capster?.name ?? "-"} />
          )}
        </FeedGate>
      </main>
    </div>
  );
}

type Phase = "idle" | "verifying" | "verified" | PaymentOutcome | "error";

function PaymentPanel({ booking, capsterName }: { booking: Booking; capsterName: string }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [busy, setBusy] = useState<PaymentOutcome | null>(null);

  const isPending = booking.status === "payment_pending";
  const released = booking.status === "payment_expired";

  const onExpire = useCallback(() => expireStalePayments(), []);

  useEffect(() => {
    if (phase === "verified") {
      const t = setTimeout(
        () => void navigate({ to: "/tiket/$bookingId", params: { bookingId: booking.id } }),
        1300,
      );
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, navigate, booking.id]);

  const run = async (outcome: PaymentOutcome) => {
    setBusy(outcome);
    if (outcome === "success") setPhase("verifying");
    try {
      await simulatePayment(booking.id, outcome);
      if (outcome === "success") {
        setPhase("verified");
        notify.success("Pembayaran DP berhasil", "Nomor antrean Anda sudah terbit.");
      } else {
        setPhase(outcome);
        if (outcome === "pending") notify.warning("Pembayaran masih pending", "Menunggu konfirmasi dari penyedia pembayaran.");
        if (outcome === "failed") notify.error("Pembayaran gagal", "Slot antrean dilepas.");
        if (outcome === "expired") notify.error("Pembayaran kedaluwarsa", "Slot antrean dilepas.");
      }
    } catch (e) {
      setPhase("error");
      notify.fromError(e, "Pembayaran gagal diproses");
    } finally {
      setBusy(null);
    }
  };

  if (phase === "verifying" || phase === "verified") {
    const done = phase === "verified";
    return (
      <div className="surface-card p-6 text-center" role="status" aria-live="polite">
        <SandboxLabel />
        <span
          className={cn(
            "mx-auto mt-6 grid size-16 place-items-center rounded-full",
            done ? "bg-success-soft text-success-ink" : "bg-bronze-soft text-bronze-ink",
          )}
        >
          {done ? <CheckCircle2 className="size-8" aria-hidden /> : <Loader2 className="size-8 animate-spin" aria-hidden />}
        </span>
        <h1 className="mt-4 text-3xl font-bold">
          {done ? "Pembayaran terverifikasi" : "Memverifikasi pembayaran dari server"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {done
            ? "Nomor antrean sudah diterbitkan. Membuka tiket Anda…"
            : "Kami menunggu notifikasi resmi dari Midtrans sebelum menerbitkan nomor antrean. Jangan tutup halaman ini."}
        </p>
        <ol className="mx-auto mt-5 max-w-xs space-y-2 text-left text-sm">
          {[
            ["Pembayaran diterima Midtrans", true],
            ["Notifikasi dikirim ke server toko", true],
            ["Server memvalidasi signature & nominal", done],
            ["Nomor antrean diterbitkan", done],
          ].map(([t, ok]) => (
            <li key={t as string} className="flex items-center gap-2">
              {ok ? (
                <CheckCircle2 className="size-4 text-success" aria-hidden />
              ) : (
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
              )}
              <span className={cn(!ok && "text-muted-foreground")}>{t as string}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-charcoal px-4 py-3 text-cream">
          <span className="inline-flex items-center gap-2 font-display text-lg font-bold tracking-wide">
            <CreditCard className="size-5 text-bronze" aria-hidden />
            Pembayaran DP
          </span>
          <SandboxLabel dark />
        </div>

        <div className="p-4 sm:p-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Order ID</dt>
            <dd className="text-right font-mono text-xs font-semibold break-all">{booking.payment.orderId}</dd>
            <dt className="text-muted-foreground">Nama</dt>
            <dd className="text-right font-medium">{booking.customerName}</dd>
            <dt className="text-muted-foreground">Capster</dt>
            <dd className="text-right font-medium">{capsterName}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="text-right">
              <StatusBadge kind="payment" value={booking.payment.status} />
            </dd>
          </dl>

          <div className="mt-4 flex items-end justify-between gap-4 rounded-lg bg-bronze-soft p-4">
            <div>
              <p className="text-xs font-medium text-bronze-ink">Total DP</p>
              <p className="font-display text-4xl leading-none font-bold tabular">{formatRupiah(booking.payment.amount)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Sisa {formatRupiah(REMAINING_AMOUNT)} dibayar di toko</p>
            </div>
            {isPending && (
              <Countdown until={booking.payment.expiresAt} label="Batas bayar" onExpire={onExpire} size="lg" warnBelowMs={120_000} />
            )}
          </div>

          {isPending && phase === "pending" && (
            <div role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-warning-ink">
              <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                <strong>Pembayaran pending.</strong> Transaksi tercatat tetapi belum dikonfirmasi bank. Slot tetap ditahan
                sampai waktu habis. Anda bisa menyimulasikan hasil akhirnya di bawah.
              </p>
            </div>
          )}
          {isPending && phase === "error" && (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger-ink">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>Permintaan ke server gagal. Status pembayaran belum berubah, silakan coba lagi.</p>
            </div>
          )}
        </div>
      </div>

      {isPending ? (
        <section aria-labelledby="sim-title" className="surface-card space-y-3 p-4 sm:p-5">
          <div>
            <h2 id="sim-title" className="flex items-center gap-2 text-xl font-bold">
              <FlaskConical className="size-5 text-bronze-ink" aria-hidden />
              Simulasi hasil pembayaran
            </h2>
            <p className="text-sm text-muted-foreground">
              Lingkungan sandbox: tidak ada uang sungguhan yang ditarik dan tidak ada data kartu yang disimpan.
            </p>
          </div>
          <Button size="xl" variant="success" className="w-full" disabled={!!busy} onClick={() => run("success")}>
            {busy === "success" ? <Loader2 className="animate-spin" aria-hidden /> : <CheckCircle2 aria-hidden />}
            Simulasikan Pembayaran Berhasil
          </Button>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="outline" disabled={!!busy} onClick={() => run("pending")}>
              {busy === "pending" ? <Loader2 className="animate-spin" aria-hidden /> : <Clock3 aria-hidden />}
              Simulasikan Pending
            </Button>
            <Button variant="destructive-outline" disabled={!!busy} onClick={() => run("failed")}>
              {busy === "failed" ? <Loader2 className="animate-spin" aria-hidden /> : <XCircle aria-hidden />}
              Simulasikan Gagal
            </Button>
            <Button variant="destructive-outline" disabled={!!busy} onClick={() => run("expired")}>
              {busy === "expired" ? <Loader2 className="animate-spin" aria-hidden /> : <CircleSlash aria-hidden />}
              Simulasikan Kedaluwarsa
            </Button>
          </div>
        </section>
      ) : released ? (
        <ReleasedState booking={booking} />
      ) : (
        <div className="surface-card p-5 text-center">
          <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden />
          <p className="mt-2 font-semibold">Pembayaran ini sudah selesai.</p>
          <Link to="/tiket/$bookingId" params={{ bookingId: booking.id }} className={cn(buttonVariants({ size: "lg" }), "mt-4")}>
            Lihat Tiket {booking.queueNumber}
          </Link>
        </div>
      )}
    </div>
  );
}

function ReleasedState({ booking }: { booking: Booking }) {
  const failed = booking.payment.status === "failed";
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-5 text-center">
      {failed ? (
        <XCircle className="mx-auto size-9 text-danger-ink" aria-hidden />
      ) : (
        <CircleSlash className="mx-auto size-9 text-danger-ink" aria-hidden />
      )}
      <h2 className="mt-2 text-2xl font-bold text-danger-ink">{failed ? "Pembayaran gagal" : "Waktu pembayaran habis"}</h2>
      <p className="mt-1 text-sm text-danger-ink/90">
        Reservasi slot sudah dilepas dan tidak ada dana yang ditarik. Silakan buat booking baru bila masih ingin
        mengantre.
      </p>
      <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
        <Link to="/booking/$capsterId" params={{ capsterId: booking.capsterId }} className={buttonVariants({ size: "lg" })}>
          Booking Ulang
        </Link>
        <Link to="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Ke Beranda
        </Link>
      </div>
    </div>
  );
}

function SandboxLabel({ dark }: { dark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-dashed px-2 py-1 text-[0.7rem] font-bold tracking-wider uppercase",
        dark ? "border-bronze text-bronze" : "border-bronze-ink text-bronze-ink",
      )}
    >
      <ServerCog className="size-3.5" aria-hidden />
      Midtrans Sandbox Demo
    </span>
  );
}
