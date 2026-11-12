import { createFileRoute } from "@tanstack/react-router";
import {
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  Lock,
  Megaphone,
  RotateCcw,
  Scissors,
  Store,
  Ticket,
  UserX,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CapsterAvatar } from "@/components/queue/CapsterAvatar";
import { ConfirmationDialog } from "@/components/queue/ConfirmationDialog";
import { FeedGate, LastUpdated } from "@/components/queue/FeedGate";
import { PAYMENT_TYPE_LABEL, PaymentStatus } from "@/components/queue/PaymentStatus";
import { QueueTimeline } from "@/components/queue/QueueTimeline";
import { StaffShell } from "@/components/queue/StaffShell";
import { EmptyState, LoadingSkeleton } from "@/components/queue/States";
import { StatusBadge, bookingBadgeValue, type BookingBadgeValue } from "@/components/queue/StatusBadge";
import { SummaryCard } from "@/components/queue/SummaryCard";
import { notify } from "@/components/queue/ToastNotification";
import { adminCancel, completeRefund, requestRefund, setPromoOptOut, setShopOpen } from "@/lib/queue/api";
import { useNow, useQueueData } from "@/lib/queue/feed";
import {
  capsterDisplayStatus,
  formatDate,
  formatRupiah,
  formatTime,
  inServiceFor,
  maskPhone,
  waitingFor,
} from "@/lib/queue/logic";
import type { Booking, QueueState } from "@/lib/queue/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Dashboard Admin — Cukur Rapi Barbershop" },
      { name: "description", content: "Kelola toko, antrean, pembayaran DP, refund, dan daftar izin promosi hari ini." },
      { property: "og:title", content: "Dashboard Admin — Cukur Rapi Barbershop" },
      { property: "og:description", content: "Ringkasan harian antrean, pembayaran, dan capster." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <StaffShell role="admin" title="Dashboard Admin">
      {() => <AdminDashboard />}
    </StaffShell>
  ),
});

const STATUS_FILTERS: { id: "all" | BookingBadgeValue; label: string }[] = [
  { id: "all", label: "Semua status" },
  { id: "payment_pending", label: "Menunggu Pembayaran" },
  { id: "waiting", label: "Menunggu" },
  { id: "called", label: "Dipanggil" },
  { id: "in_service", label: "Sedang Dilayani" },
  { id: "completed", label: "Selesai" },
  { id: "cancelled", label: "Dibatalkan" },
  { id: "no_show", label: "Tidak Hadir" },
  { id: "payment_expired", label: "Pembayaran Kedaluwarsa" },
];

const selectClass =
  "h-10 w-full rounded-md border border-input bg-surface px-3 text-sm focus-visible:border-bronze focus-visible:ring-2 focus-visible:ring-bronze/50 focus-visible:outline-none";

function AdminDashboard() {
  const state = useQueueData();
  const now = useNow(5000);
  const [shopDialog, setShopDialog] = useState(false);
  const [detail, setDetail] = useState<Booking | null>(null);

  const b = state.bookings;
  const paid = b.filter((x) => x.payment.paidAt !== null);
  const sumDp = paid
    .filter((x) => x.payment.status === "paid" || x.payment.status === "refund_pending")
    .reduce((a, x) => a + x.payment.amount, 0);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            Tanggal operasional · {formatDate(now)}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-extrabold uppercase">Dashboard admin</h1>
            <StatusBadge kind="shop" value={state.shopOpen} size="md" />
          </div>
          <LastUpdated />
        </div>
        <ConfirmationDialog
          open={shopDialog}
          onOpenChange={setShopDialog}
          trigger={
            <Button size="lg" variant={state.shopOpen ? "destructive-outline" : "success"}>
              {state.shopOpen ? <Lock aria-hidden /> : <Store aria-hidden />}
              {state.shopOpen ? "Tutup Toko" : "Buka Toko"}
            </Button>
          }
          tone={state.shopOpen ? "danger" : "default"}
          title={state.shopOpen ? "Tutup toko sekarang?" : "Buka toko sekarang?"}
          description={
            state.shopOpen
              ? "Pelanggan tidak bisa booking lagi. Antrean yang sudah terbayar tetap dilayani."
              : "Pelanggan bisa mulai booking ke capster yang sudah aktif."
          }
          confirmLabel={state.shopOpen ? "Ya, tutup toko" : "Ya, buka toko"}
          confirmVariant={state.shopOpen ? "destructive" : "success"}
          onConfirm={() => setShopOpen(!state.shopOpen)}
          onDone={() => notify.success(state.shopOpen ? "Toko dibuka" : "Toko ditutup")}
        />
      </section>

      <FeedGate skeleton={<LoadingSkeleton variant="table" count={6} />}>
        <section aria-label="Ringkasan hari ini" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <SummaryCard label="Booking Terbayar" value={paid.length} icon={Ticket} tone="bronze" />
          <SummaryCard label="Sedang Menunggu" value={b.filter((x) => x.status === "waiting").length} icon={Clock} />
          <SummaryCard label="Sedang Dilayani" value={b.filter((x) => x.status === "in_service").length} icon={Scissors} tone="dark" />
          <SummaryCard label="Selesai" value={b.filter((x) => x.status === "completed").length} icon={CheckCircle2} tone="success" />
          <SummaryCard label="Tidak Hadir" value={b.filter((x) => x.status === "no_show").length} icon={UserX} tone="danger" />
          <SummaryCard label="Total DP" value={formatRupiah(sumDp)} icon={Wallet} tone="success" hint="Tidak termasuk refund selesai" />
          <SummaryCard label="Refund Pending" value={b.filter((x) => x.payment.status === "refund_pending").length} icon={RotateCcw} tone="warning" />
        </section>

        <CapsterList state={state} />

        <Tabs defaultValue="antrean" className="mt-2">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="antrean">Antrean hari ini</TabsTrigger>
            <TabsTrigger value="pembayaran">Pembayaran</TabsTrigger>
            <TabsTrigger value="promosi">Izin promosi</TabsTrigger>
          </TabsList>
          <TabsContent value="antrean">
            <QueueTable state={state} onDetail={setDetail} />
          </TabsContent>
          <TabsContent value="pembayaran">
            <PaymentsTable state={state} onDetail={setDetail} />
          </TabsContent>
          <TabsContent value="promosi">
            <PromoList state={state} />
          </TabsContent>
        </Tabs>
      </FeedGate>

      <DetailDialog booking={detail ? (state.bookings.find((x) => x.id === detail.id) ?? null) : null} state={state} onClose={() => setDetail(null)} />
    </div>
  );
}

function CapsterList({ state }: { state: QueueState }) {
  if (state.capsters.length === 0)
    return <EmptyState title="Belum ada data capster" description="Server belum mengirim daftar capster." />;
  return (
    <section aria-labelledby="judul-capster-admin">
      <h2 id="judul-capster-admin" className="mb-3 text-2xl font-bold uppercase">Capster</h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {state.capsters.map((c) => {
          const st = capsterDisplayStatus(state, c);
          const serving = inServiceFor(state, c.id);
          return (
            <li key={c.id} className="surface-card flex items-center gap-3 p-4">
              <CapsterAvatar name={c.name} size="sm" muted={c.shift !== "active"} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {serving ? `Melayani ${serving.queueNumber} · ` : ""}
                  {waitingFor(state, c.id).length} menunggu
                </p>
              </div>
              <StatusBadge kind="capster" value={st === "inactive" || st === "finished" || st === "serving" ? st : "active"} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RowActions({ booking, onDetail }: { booking: Booking; onDetail: (b: Booking) => void }) {
  const canCancel = booking.status === "waiting" || booking.status === "payment_pending";
  const canRefund = booking.status === "cancelled" && booking.payment.status === "paid";
  const canFinishRefund = booking.payment.status === "refund_pending";
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button size="sm" variant="ghost" onClick={() => onDetail(booking)}>
        <Eye aria-hidden /> Lihat Detail
      </Button>
      {canCancel && (
        <ConfirmationDialog
          trigger={<Button size="sm" variant="destructive-outline"><Ban aria-hidden /> Batalkan</Button>}
          tone="danger"
          title={`Batalkan ${booking.queueNumber ?? booking.payment.orderId}?`}
          description="Pembatalan dari barbershop. Setelah dibatalkan, Anda dapat mengajukan refund DP untuk pelanggan."
          confirmLabel="Ya, batalkan booking"
          onConfirm={() => adminCancel(booking.id)}
          onDone={() => notify.success("Booking dibatalkan")}
        />
      )}
      {canRefund && (
        <ConfirmationDialog
          trigger={<Button size="sm" variant="outline"><RotateCcw aria-hidden /> Ajukan Refund</Button>}
          title="Ajukan refund DP?"
          description={`DP ${formatRupiah(booking.payment.amount)} untuk ${booking.customerName} akan diproses refund ke metode pembayaran asal.`}
          confirmLabel="Ajukan refund"
          onConfirm={() => requestRefund(booking.id)}
          onDone={() => notify.success("Refund diajukan", "Status pembayaran: Refund Diproses.")}
        />
      )}
      {canFinishRefund && (
        <ConfirmationDialog
          trigger={<Button size="sm" variant="success"><CheckCircle2 aria-hidden /> Refund Selesai</Button>}
          title="Tandai refund selesai?"
          description="Pastikan dana sudah benar-benar dikembalikan ke pelanggan."
          confirmLabel="Tandai Refund Selesai"
          confirmVariant="success"
          onConfirm={() => completeRefund(booking.id)}
          onDone={() => notify.success("Refund ditandai selesai")}
        />
      )}
    </div>
  );
}

function QueueTable({ state, onDetail }: { state: QueueState; onDetail: (b: Booking) => void }) {
  const [capster, setCapster] = useState("all");
  const [status, setStatus] = useState<"all" | BookingBadgeValue>("all");
  const rows = useMemo(
    () =>
      state.bookings
        .filter((b) => capster === "all" || b.capsterId === capster)
        .filter((b) => status === "all" || bookingBadgeValue(b) === status)
        .sort((a, b) => (a.queuedAt ?? a.createdAt) - (b.queuedAt ?? b.createdAt)),
    [state.bookings, capster, status],
  );
  const name = (id: string) => state.capsters.find((c) => c.id === id)?.name ?? "-";

  return (
    <section aria-label="Tabel antrean" className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <div>
          <Label htmlFor="f-capster" className="text-xs font-semibold">Filter capster</Label>
          <select id="f-capster" className={cn(selectClass, "mt-1")} value={capster} onChange={(e) => setCapster(e.target.value)}>
            <option value="all">Semua capster</option>
            {state.capsters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="f-status" className="text-xs font-semibold">Filter status</Label>
          <select id="f-status" className={cn(selectClass, "mt-1")} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {STATUS_FILTERS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Tidak ada antrean" description="Tidak ada booking yang cocok dengan filter ini." />
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground uppercase">
              <tr>
                {["No.", "Pelanggan", "WhatsApp", "Capster", "Status booking", "Pembayaran", "Waktu bayar", ""].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2.5 font-semibold">{h || <span className="sr-only">Tindakan</span>}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-3 py-2.5 font-display text-lg font-bold whitespace-nowrap tabular">{b.queueNumber ?? "—"}</td>
                  <td className="px-3 py-2.5 font-medium">{b.customerName}</td>
                  <td className="px-3 py-2.5 tabular text-muted-foreground">{maskPhone(b.phone)}</td>
                  <td className="px-3 py-2.5">{name(b.capsterId)}</td>
                  <td className="px-3 py-2.5"><StatusBadge kind="booking" value={bookingBadgeValue(b)} /></td>
                  <td className="px-3 py-2.5"><StatusBadge kind="payment" value={b.payment.status} /></td>
                  <td className="px-3 py-2.5 tabular">{b.payment.paidAt ? `${formatTime(b.payment.paidAt)}` : "—"}</td>
                  <td className="px-3 py-2"><RowActions booking={b} onDetail={onDetail} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PaymentsTable({ state, onDetail }: { state: QueueState; onDetail: (b: Booking) => void }) {
  const rows = [...state.bookings].sort((a, b) => b.payment.createdAt - a.payment.createdAt);
  if (rows.length === 0) return <EmptyState title="Belum ada pembayaran" description="Pembayaran DP hari ini akan tampil di sini." />;
  return (
    <div className="surface-card overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground uppercase">
          <tr>
            {["Order ID", "Pelanggan", "DP", "Status", "Metode", "Waktu bayar", ""].map((h) => (
              <th key={h} scope="col" className="px-3 py-2.5 font-semibold">{h || <span className="sr-only">Tindakan</span>}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/40">
              <td className="px-3 py-2.5 font-mono text-xs">{b.payment.orderId}</td>
              <td className="px-3 py-2.5">{b.customerName} <span className="text-muted-foreground">{b.queueNumber ?? ""}</span></td>
              <td className="px-3 py-2.5 tabular">{formatRupiah(b.payment.amount)}</td>
              <td className="px-3 py-2.5"><StatusBadge kind="payment" value={b.payment.status} /></td>
              <td className="px-3 py-2.5">{b.payment.type ? PAYMENT_TYPE_LABEL[b.payment.type] : "—"}</td>
              <td className="px-3 py-2.5 tabular">{b.payment.paidAt ? formatTime(b.payment.paidAt) : "—"}</td>
              <td className="px-3 py-2"><RowActions booking={b} onDetail={onDetail} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PromoList({ state }: { state: QueueState }) {
  const rows = state.bookings.filter((b) => b.promoOptIn || b.promoOptOutAt !== null);
  if (rows.length === 0)
    return <EmptyState icon={Megaphone} title="Belum ada izin promosi" description="Pelanggan yang mencentang izin promosi akan tampil di sini." />;
  return (
    <section className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Hanya kirim promosi ke status <strong>Opt-in</strong>. Nomor ditampilkan tersamar.
      </p>
      <ul className="surface-card divide-y divide-border">
        {rows.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{b.customerName}</p>
              <p className="text-xs tabular text-muted-foreground">{maskPhone(b.phone)}</p>
            </div>
            {b.promoOptIn ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success-ink">
                <CheckCircle2 className="size-3.5" aria-hidden /> Opt-in
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                <Ban className="size-3.5" aria-hidden /> Opt-out {b.promoOptOutAt ? `· ${formatTime(b.promoOptOutAt)}` : ""}
              </span>
            )}
            {b.promoOptIn && (
              <ConfirmationDialog
                trigger={<Button size="sm" variant="ghost">Catat Opt-out</Button>}
                title="Catat permintaan berhenti promosi?"
                description={`${b.customerName} tidak akan menerima promosi lagi.`}
                confirmLabel="Ya, catat opt-out"
                onConfirm={() => setPromoOptOut(b.id)}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DetailDialog({ booking, state, onClose }: { booking: Booking | null; state: QueueState; onClose: () => void }) {
  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {booking && (
          <>
            <DialogHeader className="text-left">
              <DialogTitle className="font-display text-3xl">
                {booking.queueNumber ?? "Tanpa nomor"} · {booking.customerName}
              </DialogTitle>
              <div className="flex flex-wrap gap-2">
                <StatusBadge kind="booking" value={bookingBadgeValue(booking)} />
                <span className="text-sm text-muted-foreground">
                  {state.capsters.find((c) => c.id === booking.capsterId)?.name} · {maskPhone(booking.phone)}
                </span>
              </div>
            </DialogHeader>
            <QueueTimeline booking={booking} />
            <PaymentStatus payment={booking.payment} />
            <p className="text-xs text-muted-foreground">
              Dibatalkan oleh: {booking.cancelledBy === "shop" ? "Barbershop" : booking.cancelledBy === "customer" ? "Pelanggan" : "—"} ·
              Izin promosi: {booking.promoOptIn ? "Ya" : "Tidak"}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
