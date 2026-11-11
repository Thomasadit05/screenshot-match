import { createFileRoute } from "@tanstack/react-router";
import { BellRing, CheckCircle2, Coffee, Lock, Play, Power, Scissors, UserX } from "lucide-react";
import { ActionButton } from "@/components/queue/ActionButton";
import { CapsterAvatar } from "@/components/queue/CapsterAvatar";
import { ConfirmationDialog } from "@/components/queue/ConfirmationDialog";
import { Countdown } from "@/components/queue/Countdown";
import { FeedGate, LastUpdated } from "@/components/queue/FeedGate";
import { QueueCard } from "@/components/queue/QueueCard";
import { StaffShell } from "@/components/queue/StaffShell";
import { EmptyState } from "@/components/queue/States";
import { StatusBadge } from "@/components/queue/StatusBadge";
import { Button } from "@/components/ui/button";
import { callBooking, completeService, markNoShow, setCapsterShift, startService } from "@/lib/queue/api";
import { useNow, useQueueData } from "@/lib/queue/feed";
import {
  canMarkNoShow,
  capsterDisplayStatus,
  formatDate,
  inServiceFor,
  isCalled,
  remainingServiceMinutes,
  toleranceEndsAt,
  waitingFor,
} from "@/lib/queue/logic";
import type { Booking } from "@/lib/queue/types";

export const Route = createFileRoute("/capster")({
  head: () => ({
    meta: [
      { title: "Dashboard Capster — Cukur Rapi Barbershop" },
      { name: "description", content: "Panggil, mulai, dan selesaikan antrean pelanggan Anda hari ini." },
      { property: "og:title", content: "Dashboard Capster — Cukur Rapi Barbershop" },
      { property: "og:description", content: "Kelola antrean milik capster: Panggil, Mulai Potong, Selesai, Tidak Hadir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <StaffShell role="capster" title="Dashboard Capster">
      {(s) => (s.role === "capster" ? <CapsterDashboard capsterId={s.capsterId} /> : null)}
    </StaffShell>
  ),
});

function CapsterDashboard({ capsterId }: { capsterId: string }) {
  const state = useQueueData();
  const now = useNow(1000);
  const capster = state.capsters.find((c) => c.id === capsterId);

  if (!capster) {
    return (
      <FeedGate>
        <EmptyState title="Data capster belum tersedia" description="Server belum mengirim data capster. Coba lagi sebentar." />
      </FeedGate>
    );
  }

  const serving = inServiceFor(state, capsterId);
  const queue = waitingFor(state, capsterId);
  const called = queue.find(isCalled) ?? null;
  const focus: Booking | null = serving ?? called ?? queue[0] ?? null;
  const rest = queue.filter((b) => b.id !== focus?.id);
  const next = serving ? (called ?? queue[0] ?? null) : (rest[0] ?? null);
  const listOthers = rest.filter((b) => b.id !== next?.id);
  const status = capsterDisplayStatus(state, capster);
  const working = capster.shift === "active";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="flex flex-wrap items-center gap-3">
        <CapsterAvatar name={capster.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>{formatDate(now)}</p>
          <h1 className="text-4xl leading-none font-extrabold uppercase">Halo, {capster.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge kind="capster" value={status} />
            <StatusBadge kind="shop" value={state.shopOpen} />
          </div>
        </div>
        {working ? (
          <ConfirmationDialog
            trigger={
              <Button variant="outline" size="lg">
                <Power aria-hidden /> Selesai Kerja
              </Button>
            }
            title="Selesai kerja hari ini?"
            description={
              queue.length > 0
                ? `Masih ada ${queue.length} pelanggan menunggu. Mereka perlu dialihkan oleh admin. Anda tidak akan bisa dipilih pelanggan lagi.`
                : "Anda tidak akan bisa dipilih pelanggan lagi sampai menekan Aktif."
            }
            confirmLabel="Ya, selesai kerja"
            onConfirm={() => setCapsterShift(capsterId, "finished")}
          />
        ) : (
          <ActionButton size="xl" variant="success" onAction={() => setCapsterShift(capsterId, "active")} successText="Anda aktif">
            <Power aria-hidden /> Aktif
          </ActionButton>
        )}
      </section>

      <FeedGate>
        {!working ? (
          <EmptyState
            icon={capster.shift === "finished" ? Lock : Coffee}
            title={capster.shift === "finished" ? "Anda sudah selesai kerja" : "Anda belum aktif"}
            description={
              capster.shift === "finished"
                ? "Tekan Aktif bila ingin kembali menerima pelanggan."
                : "Tekan tombol Aktif setelah tiba di toko agar pelanggan bisa memilih Anda."
            }
          />
        ) : (
          <div className="space-y-5">
            {!state.shopOpen && (
              <p role="status" className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-warning-ink">
                Toko sedang ditutup admin. Booking baru tidak masuk, tetapi antrean yang sudah ada tetap dilayani.
              </p>
            )}

            {focus ? (
              <FocusCard booking={focus} hasServing={!!serving} now={now} />
            ) : (
              <EmptyState icon={CheckCircle2} title="Antrean kosong" description="Belum ada pelanggan terbayar untuk Anda. Santai sejenak." />
            )}

            {next && (
              <QueueCard
                booking={next}
                variant="next"
                eyebrow="Pelanggan berikutnya"
                meta={isCalled(next) ? "Sudah dipanggil, menunggu kursi kosong." : "Panggil saat potongan saat ini hampir selesai."}
                actions={<BookingActions booking={next} hasServing={!!serving} now={now} />}
              />
            )}

            <section aria-labelledby="antrean-saya">
              <div className="mb-2 flex items-end justify-between gap-2">
                <h2 id="antrean-saya" className="text-2xl font-bold uppercase">
                  Antrean terbayar ({queue.length})
                </h2>
                <LastUpdated />
              </div>
              {listOthers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada antrean lain.</p>
              ) : (
                <ul className="space-y-2">
                  {listOthers.map((b) => (
                    <li key={b.id}>
                      <QueueCard booking={b} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </FeedGate>
    </div>
  );
}

function FocusCard({ booking, hasServing, now }: { booking: Booking; hasServing: boolean; now: number }) {
  const inService = booking.status === "in_service";
  return (
    <QueueCard
      booking={booking}
      variant="current"
      eyebrow={inService ? "Sedang dilayani" : isCalled(booking) ? "Dipanggil — menunggu hadir" : "Giliran berikutnya"}
      meta={
        inService ? (
          <span className="inline-flex items-center gap-1.5">
            <Scissors className="size-4" aria-hidden /> Sisa estimasi ±{remainingServiceMinutes(booking, now)} menit
          </span>
        ) : isCalled(booking) ? (
          <Countdown until={toleranceEndsAt(booking) ?? now} label="Toleransi hadir" className="[&_*]:text-cream" />
        ) : (
          "Tekan Panggil agar pelanggan mendapat notifikasi di tiket dan display."
        )
      }
      actions={<BookingActions booking={booking} hasServing={hasServing} now={now} dark />}
    />
  );
}

function BookingActions({ booking, hasServing, now, dark }: { booking: Booking; hasServing: boolean; now: number; dark?: boolean }) {
  const state = useQueueData();
  if (booking.status === "in_service") {
    return (
      <ActionButton size="xl" variant="bronze" className="w-full sm:w-auto" onAction={() => completeService(booking.id)} successText="Selesai">
        <CheckCircle2 aria-hidden /> Selesai
      </ActionButton>
    );
  }
  const called = isCalled(booking);
  const otherCalled = waitingFor(state, booking.capsterId).some((b) => isCalled(b) && b.id !== booking.id);
  const noShowOk = canMarkNoShow(booking, now);
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {!called && (
          <ActionButton
            size="lg"
            variant={dark ? "on-dark" : "default"}
            disabled={otherCalled}
            onAction={() => callBooking(booking.id)}
            successText="Dipanggil"
          >
            <BellRing aria-hidden /> Panggil
          </ActionButton>
        )}
        <ActionButton
          size="lg"
          variant={dark ? "bronze" : "outline"}
          disabled={hasServing}
          onAction={() => startService(booking.id)}
          successText="Dimulai"
        >
          <Play aria-hidden /> Mulai Potong
        </ActionButton>
        {called && (
          <ConfirmationDialog
            trigger={
              <Button size="lg" variant={dark ? "ghost-dark" : "destructive-outline"} disabled={!noShowOk}>
                <UserX aria-hidden /> Tidak Hadir
              </Button>
            }
            tone="danger"
            title={`Tandai ${booking.queueNumber} tidak hadir?`}
            description="Nomor ini akan dilewati dan DP hangus. Tindakan tidak bisa dibatalkan."
            confirmLabel="Ya, tidak hadir"
            onConfirm={() => markNoShow(booking.id)}
          />
        )}
      </div>
      <p className={dark ? "text-xs text-cream/60" : "text-xs text-muted-foreground"}>
        {hasServing
          ? "Mulai Potong terkunci: masih ada pelanggan yang sedang dilayani."
          : otherCalled && !called
            ? "Panggil terkunci: ada pelanggan lain yang sedang dipanggil."
            : called && !noShowOk
              ? "Tidak Hadir aktif setelah toleransi 5 menit habis."
              : null}
      </p>
    </div>
  );
}
