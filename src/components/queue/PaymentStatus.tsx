import { formatRupiah, formatTime } from "@/lib/queue/logic";
import type { Payment, PaymentType } from "@/lib/queue/types";
import { StatusBadge } from "./StatusBadge";

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  bank_transfer: "Transfer Bank (VA)",
};

export function PaymentStatus({ payment, title = "Pembayaran DP" }: { payment: Payment; title?: string }) {
  const rows: [string, string][] = [
    ["Order ID", payment.orderId],
    ["Nominal DP", formatRupiah(payment.amount)],
    ["Metode", payment.type ? PAYMENT_TYPE_LABEL[payment.type] : "—"],
    ["Waktu bayar", payment.paidAt ? `${formatTime(payment.paidAt)} WIB` : "—"],
  ];
  return (
    <section className="rounded-lg border border-border bg-surface p-4" aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <StatusBadge kind="payment" value={payment.status} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium tabular break-all">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
