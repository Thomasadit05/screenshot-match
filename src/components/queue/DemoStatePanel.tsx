import { useNavigate, useRouterState } from "@tanstack/react-router";
import { FlaskConical, RotateCcw, Timer } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  applyScenario,
  callFirstWaiting,
  createDemoPendingBooking,
  demoLogin,
  fastForwardPayments,
  resetState,
  SCENARIOS,
  setCapsterShiftNow,
  setNetwork,
  setShopOpenNow,
  skipTolerance,
} from "@/lib/queue/demo";
import { useQueueState } from "@/lib/queue/store";
import type { Booking, CapsterShift, NetworkMode } from "@/lib/queue/types";
import { cn } from "@/lib/utils";
import { notify } from "./ToastNotification";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Chip({ active, onClick, children, disabled }: { active?: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        active ? "border-charcoal bg-charcoal text-cream" : "border-input bg-surface hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

const NETWORK: { id: NetworkMode; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "slow", label: "Lambat (loading)" },
  { id: "offline", label: "Koneksi terputus" },
  { id: "server_error", label: "Error server" },
  { id: "empty", label: "Data kosong" },
];

const SHIFTS: { id: CapsterShift; label: string }[] = [
  { id: "inactive", label: "Belum aktif" },
  { id: "active", label: "Aktif" },
  { id: "finished", label: "Selesai kerja" },
];

export function DemoStatePanel() {
  const state = useQueueState();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onDisplay = pathname.startsWith("/display");

  const findTicket = (pred: (b: Booking) => boolean) => state.bookings.find(pred);
  const tickets: { label: string; booking?: Booking | undefined; prepare?: () => string | null }[] = [
    { label: "Menunggu", booking: findTicket((b) => b.status === "waiting" && !b.calledAt) },
    {
      label: "Dipanggil",
      booking: findTicket((b) => b.status === "waiting" && !!b.calledAt) ?? findTicket((b) => b.status === "waiting"),
      prepare: () => {
        const called = state.bookings.find((b) => b.status === "waiting" && b.calledAt);
        if (called) return called.id;
        const w = state.bookings.find((b) => b.status === "waiting");
        return w ? callFirstWaiting(w.capsterId) : null;
      },
    },
    { label: "Sedang Dilayani", booking: findTicket((b) => b.status === "in_service") },
    { label: "Selesai", booking: findTicket((b) => b.status === "completed") },
    { label: "Dibatalkan", booking: findTicket((b) => b.status === "cancelled" && b.payment.status === "paid") },
    { label: "Tidak Hadir", booking: findTicket((b) => b.status === "no_show") },
    { label: "Payment Expired", booking: findTicket((b) => b.status === "payment_expired") },
    { label: "Refund Pending", booking: findTicket((b) => b.payment.status === "refund_pending") },
    { label: "Refunded", booking: findTicket((b) => b.payment.status === "refunded") },
  ];



  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "fixed right-3 bottom-3 z-40 inline-flex items-center gap-2 rounded-full border-2 border-dashed border-bronze px-3.5 py-2 text-xs font-bold shadow-lift transition-colors sm:right-5 sm:bottom-5",
            onDisplay ? "bg-charcoal-2 text-cream/80 hover:text-cream" : "bg-surface text-foreground hover:bg-bronze-soft",
          )}
        >
          <FlaskConical className="size-4 text-bronze" aria-hidden />
          Demo State
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl">Demo State</SheetTitle>
          <SheetDescription>
            Panel khusus prototipe untuk mengganti kondisi tanpa menunggu waktu nyata. Tidak ada di versi produksi.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5 pb-8">
          <Section title="Buka halaman">
            <div className="grid grid-cols-2 gap-1.5">
              <Chip active={pathname === "/"} onClick={() => void navigate({ to: "/" })}>Beranda</Chip>
              <Chip onClick={() => void navigate({ to: "/booking/$capsterId", params: { capsterId: "bima" } })}>Form Booking</Chip>
              <Chip
                onClick={() => {
                  const id = createDemoPendingBooking();
                  void navigate({ to: "/bayar/$bookingId", params: { bookingId: id } });
                }}
              >
                Pembayaran Sandbox
              </Chip>
              <Chip
                disabled={!state.lastBookingId}
                onClick={() => state.lastBookingId && void navigate({ to: "/tiket/$bookingId", params: { bookingId: state.lastBookingId } })}
              >
                Tiket terakhir
              </Chip>
              <Chip onClick={() => void navigate({ to: "/login" })}>Login Pegawai</Chip>
              <Chip
                onClick={() => {
                  demoLogin({ role: "admin" });
                  void navigate({ to: "/admin" });
                }}
              >
                Dashboard Admin
              </Chip>
              <Chip
                onClick={() => {
                  demoLogin({ role: "capster", capsterId: "adit" });
                  void navigate({ to: "/capster" });
                }}
              >
                Capster (Adit)
              </Chip>
              <Chip
                onClick={() => {
                  demoLogin({ role: "capster", capsterId: "bima" });
                  void navigate({ to: "/capster" });
                }}
              >
                Capster (Bima)
              </Chip>
              <Chip active={onDisplay} onClick={() => void navigate({ to: "/display" })}>Display Ruang Tunggu</Chip>
            </div>
          </Section>

          <Section title="Skenario">
            <div className="grid gap-1.5">
              {SCENARIOS.map((s) => (
                <Chip
                  key={s.id}
                  onClick={() => {
                    applyScenario(s.id);
                    notify.info(`Skenario: ${s.label}`, s.hint);
                  }}
                >
                  <span className="block font-semibold">{s.label}</span>
                  <span className="block text-[0.7rem] opacity-70">{s.hint}</span>
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Toko">
            <div className="flex gap-1.5">
              <Chip active={state.shopOpen} onClick={() => setShopOpenNow(true)}>Buka</Chip>
              <Chip active={!state.shopOpen} onClick={() => setShopOpenNow(false)}>Tutup</Chip>
            </div>
          </Section>

          <Section title="Capster">
            <div className="space-y-2">
              {state.capsters.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{c.name}</span>
                  <div className="flex gap-1">
                    {SHIFTS.map((sh) => (
                      <Chip key={sh.id} active={c.shift === sh.id} onClick={() => setCapsterShiftNow(c.id, sh.id)}>
                        {sh.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Koneksi & server">
            <div className="flex flex-wrap gap-1.5">
              {NETWORK.map((n) => (
                <Chip key={n.id} active={state.network === n.id} onClick={() => setNetwork(n.id)}>
                  {n.label}
                </Chip>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Berlaku pada pembaruan 5 detik berikutnya dan setiap tombol aksi.</p>
          </Section>

          <Section title="Tiket pelanggan">
            <div className="grid grid-cols-2 gap-1.5">
              {tickets.map((t) => (
                <Chip
                  key={t.label}
                  disabled={!t.booking}
                  onClick={() => {
                    const id = t.prepare ? t.prepare() : t.booking?.id;
                    if (id) void navigate({ to: "/tiket/$bookingId", params: { bookingId: id } });
                  }}
                >
                  {t.label}
                  {t.booking?.queueNumber && <span className="ml-1 opacity-60">{t.booking.queueNumber}</span>}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Waktu">
            <div className="grid gap-1.5">
              <Chip
                onClick={() => {
                  skipTolerance();
                  notify.info("Toleransi 5 menit dilewati", "Tombol Tidak Hadir kini bisa dipakai.");
                }}
              >
                <Timer className="mr-1 inline size-3.5" aria-hidden />
                Lewati toleransi 5 menit pelanggan dipanggil
              </Chip>
              <Chip
                onClick={() => {
                  fastForwardPayments();
                  notify.info("Pembayaran dipercepat", "Pembayaran pending akan kedaluwarsa dalam 10 detik.");
                }}
              >
                <Timer className="mr-1 inline size-3.5" aria-hidden />
                Percepat kedaluwarsa pembayaran
              </Chip>
            </div>
          </Section>

          <Section title="Data">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                resetState();
                notify.success("Data demo dikembalikan ke awal");
              }}
            >
              <RotateCcw aria-hidden />
              Reset data demo
            </Button>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
