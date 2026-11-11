import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Clock, Info, Lock, Scissors, Ticket, UserRoundX, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CapsterCard } from "@/components/queue/CapsterCard";
import { FeedGate, LastUpdated } from "@/components/queue/FeedGate";
import { PublicFooter, PublicHeader } from "@/components/queue/PublicHeader";
import { EmptyState } from "@/components/queue/States";
import { StatusBadge, bookingBadgeValue } from "@/components/queue/StatusBadge";
import { DP_AMOUNT, REMAINING_AMOUNT, SERVICE, SHOP } from "@/lib/queue/config";
import { useNow, useQueueData } from "@/lib/queue/feed";
import { capsterSummary, formatDate, formatRupiah, isActiveBooking } from "@/lib/queue/logic";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Antrean Hari Ini — Cukur Rapi Barbershop" },
      {
        name: "description",
        content: "Lihat capster yang aktif, estimasi waktu tunggu, lalu ambil nomor antrean potong rambut dengan DP Rp15.000.",
      },
      { property: "og:title", content: "Antrean Hari Ini — Cukur Rapi Barbershop" },
      {
        property: "og:description",
        content: "Pilih capster, bayar DP, dan pantau giliran potong rambut Anda dari ponsel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const state = useQueueData();
  const now = useNow(5000);
  const summaries = state.capsters.map((c) => capsterSummary(state, c, now));
  const active = summaries.filter((s) => s.capster.shift === "active");
  const inactive = summaries.filter((s) => s.capster.shift !== "active");
  const myBooking = state.bookings.find((b) => b.id === state.lastBookingId);

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 pt-6 pb-24">
        <section aria-labelledby="judul-layanan" className="grid gap-4 md:grid-cols-[1.3fr_1fr] md:items-end">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-bronze-ink">
              <CalendarClock className="size-4" aria-hidden />
              <span suppressHydrationWarning>{formatDate(now)}</span>
            </p>
            <h1 id="judul-layanan" className="mt-1 text-4xl leading-[0.95] font-extrabold uppercase sm:text-6xl">
              Ambil antrean,
              <br />
              datang pas giliran.
            </h1>
            <p className="mt-3 max-w-md text-muted-foreground">
              Pilih capster, bayar DP, lalu pantau posisi antrean dari ponsel. Tidak perlu menunggu lama di kursi tunggu.
            </p>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{SERVICE.name}</h2>
              <span className="grid size-10 place-items-center rounded-lg bg-bronze-soft text-bronze-ink">
                <Scissors className="size-5" aria-hidden />
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Harga</dt>
                <dd className="font-display text-2xl font-bold tabular">{formatRupiah(SERVICE.price)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">DP {SERVICE.dpPercent}%</dt>
                <dd className="font-display text-2xl font-bold text-bronze-ink tabular">{formatRupiah(DP_AMOUNT)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Durasi</dt>
                <dd className="font-display text-2xl font-bold tabular">±{SERVICE.durationMinutes} mnt</dd>
              </div>
            </dl>
            <p className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <Wallet className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Sisa {formatRupiah(REMAINING_AMOUNT)} dibayar di toko setelah selesai.
            </p>
          </div>
        </section>

        {myBooking && isActiveBooking(myBooking) && (
          <Link
            to={myBooking.status === "payment_pending" ? "/bayar/$bookingId" : "/tiket/$bookingId"}
            params={{ bookingId: myBooking.id }}
            className="mt-6 flex items-center gap-3 rounded-xl border border-bronze/40 bg-bronze-soft p-4 transition-colors hover:bg-bronze-soft/70"
          >
            <Ticket className="size-6 shrink-0 text-bronze-ink" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {myBooking.queueNumber ? `Tiket Anda ${myBooking.queueNumber}` : "Pembayaran DP Anda belum selesai"}
              </p>
              <p className="text-xs text-muted-foreground">Ketuk untuk melihat status terbaru.</p>
            </div>
            <StatusBadge kind="booking" value={bookingBadgeValue(myBooking)} />
          </Link>
        )}

        <section aria-labelledby="judul-capster" className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 id="judul-capster" className="text-3xl font-bold uppercase">
              Capster aktif
            </h2>
            <LastUpdated />
          </div>

          <FeedGate>
            {!state.shopOpen ? (
              <EmptyState
                icon={Lock}
                title="Toko sedang tutup"
                description={`Booking antrean dibuka kembali saat toko buka pukul ${SHOP.openHour} WIB. Sampai jumpa!`}
              />
            ) : active.length === 0 ? (
              <EmptyState
                icon={UserRoundX}
                title="Belum ada capster aktif"
                description="Toko sudah buka, tetapi capster belum memulai shift. Coba muat ulang beberapa menit lagi."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((s) => (
                  <CapsterCard key={s.capster.id} {...s} />
                ))}
              </div>
            )}

            {inactive.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 text-xl font-bold text-muted-foreground uppercase">Belum aktif</h3>
                <ul className="flex flex-wrap gap-2">
                  {inactive.map((s) => (
                    <li
                      key={s.capster.id}
                      className="flex items-center gap-2 rounded-full border border-border bg-muted/60 py-1 pr-3 pl-1"
                    >
                      <span className="grid size-7 place-items-center rounded-full bg-surface font-display font-bold text-muted-foreground">
                        {s.capster.name[0]}
                      </span>
                      <span className="text-sm font-semibold">{s.capster.name}</span>
                      <StatusBadge kind="capster" value={s.status} />
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">Capster yang belum aktif belum bisa dipilih.</p>
              </div>
            )}
          </FeedGate>

          <p className="mt-6 flex items-start gap-2 rounded-lg bg-muted/70 px-3 py-2.5 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            Estimasi dihitung dari sisa layanan yang sedang berjalan ditambah {SERVICE.durationMinutes} menit untuk setiap
            pelanggan yang menunggu. Waktu bisa maju atau mundur mengikuti lama pelayanan.
          </p>
        </section>

        <section aria-labelledby="judul-cara" className="mt-10">
          <h2 id="judul-cara" className="mb-4 text-3xl font-bold uppercase">
            Cara ambil antrean
          </h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Scissors, t: "Pilih capster", d: "Lihat siapa yang tersedia dan berapa lama estimasi gilirannya." },
              { icon: Wallet, t: `Bayar DP ${formatRupiah(DP_AMOUNT)}`, d: "Nomor antrean keluar setelah DP terverifikasi." },
              { icon: Clock, t: "Datang saat dipanggil", d: "Pantau tiket. Anda punya waktu 5 menit setelah dipanggil." },
            ].map((s, i) => (
              <li key={s.t} className="surface-card flex gap-3 p-4">
                <span className="font-display text-3xl leading-none font-extrabold text-bronze">{i + 1}</span>
                <div>
                  <p className="font-semibold">{s.t}</p>
                  <p className="text-sm text-muted-foreground">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            <Link to="/display" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Lihat Display Antrean
            </Link>
            <Link to="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Login Pegawai
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
