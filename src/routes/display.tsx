import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, Scissors } from "lucide-react";
import { useHydrated } from "@tanstack/react-router";
import { SHOP } from "@/lib/queue/config";
import { useFeed, useNow, useQueueData } from "@/lib/queue/feed";
import { formatDate, formatTime, inServiceFor, isCalled, waitingFor } from "@/lib/queue/logic";
import { LastUpdated } from "@/components/queue/FeedGate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/display")({
  head: () => ({
    meta: [
      { title: "Display Antrean — Cukur Rapi Barbershop" },
      { name: "description", content: "Layar ruang tunggu: nomor yang sedang dilayani dan antrean berikutnya." },
      { property: "og:title", content: "Display Antrean — Cukur Rapi Barbershop" },
      { property: "og:description", content: "Nomor antrean yang sedang dilayani dan berikutnya, diperbarui otomatis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DisplayPage,
});

function DisplayPage() {
  const hydrated = useHydrated();
  const state = useQueueData();
  const now = useNow(1000);
  const { status, retry, retrying } = useFeed();
  const active = state.capsters.filter((c) => c.shift === "active");

  return (
    <div className="display-screen flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-charcoal-3 px-6 py-4 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-lg bg-bronze text-charcoal">
            <Scissors className="size-7" aria-hidden />
          </span>
          <span className="font-display text-3xl font-bold tracking-wide uppercase lg:text-4xl">{SHOP.name}</span>
        </Link>
        <div className="text-right">
          <p className="font-display text-5xl leading-none font-bold tabular lg:text-6xl" suppressHydrationWarning>
            {hydrated ? formatTime(now) : "--:--"}
          </p>
          <p className="text-sm text-cream/60" suppressHydrationWarning>{hydrated ? formatDate(now) : ""}</p>
        </div>
      </header>

      <main className="flex-1 px-6 py-6 lg:px-10">
        {status === "loading" ? (
          <p className="pt-20 text-center font-display text-4xl text-cream/60">Memuat antrean…</p>
        ) : status === "error" || status === "offline" ? (
          <div role="alert" className="mx-auto max-w-xl pt-16 text-center">
            <p className="font-display text-5xl font-bold text-danger">
              {status === "offline" ? "Koneksi terputus" : "Server bermasalah"}
            </p>
            <p className="mt-3 text-xl text-cream/70">Layar akan mencoba lagi otomatis setiap 5 detik.</p>
            <button
              type="button"
              onClick={retry}
              disabled={retrying}
              className="mt-6 rounded-md bg-cream px-6 py-3 font-semibold text-charcoal hover:bg-bronze disabled:opacity-50"
            >
              {retrying ? "Mencoba…" : "Coba sekarang"}
            </button>
          </div>
        ) : !state.shopOpen ? (
          <p className="pt-20 text-center font-display text-6xl font-bold text-cream/80">Toko sedang tutup</p>
        ) : active.length === 0 ? (
          <p className="pt-20 text-center font-display text-5xl font-bold text-cream/70">Belum ada capster aktif</p>
        ) : (
          <div className={cn("grid gap-6", active.length >= 3 ? "lg:grid-cols-3" : active.length === 2 ? "md:grid-cols-2" : "")}>
            {active.map((c) => {
              const serving = inServiceFor(state, c.id);
              const queue = waitingFor(state, c.id);
              const called = queue.find(isCalled);
              const next = queue.filter((b) => b.id !== called?.id).slice(0, 3);
              return (
                <section
                  key={c.id}
                  aria-label={`Capster ${c.name}`}
                  className="flex flex-col rounded-2xl border border-charcoal-3 bg-charcoal-2 p-6"
                >
                  <h2 className="font-display text-4xl font-bold tracking-wide text-bronze uppercase">{c.name}</h2>
                  <p className="mt-4 text-lg text-cream/60 uppercase">Sedang dilayani</p>
                  <p className="font-display text-[7rem] leading-none font-extrabold tabular lg:text-[9rem]">
                    {serving?.queueNumber ?? "—"}
                  </p>
                  {called && (
                    <p className="mt-4 flex items-center gap-3 rounded-xl bg-bronze px-4 py-3 font-display text-4xl font-bold text-charcoal">
                      <BellRing className="size-9 animate-pulse" aria-hidden />
                      Dipanggil: {called.queueNumber}
                    </p>
                  )}
                  <div className="mt-6 border-t border-charcoal-3 pt-4">
                    <p className="text-lg text-cream/60 uppercase">Berikutnya</p>
                    {next.length === 0 ? (
                      <p className="font-display text-3xl text-cream/50">Tidak ada antrean</p>
                    ) : (
                      <p className="flex flex-wrap gap-x-6 font-display text-5xl font-bold tabular">
                        {next.map((b) => <span key={b.id}>{b.queueNumber}</span>)}
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
      <footer className="flex flex-wrap items-center justify-between gap-2 px-6 pb-20 text-cream/60 lg:px-10">
        <p className="text-lg">Ambil antrean dari ponsel Anda. Hadir maksimal 5 menit setelah nomor dipanggil.</p>
        <LastUpdated dark />
      </footer>
    </div>
  );
}
