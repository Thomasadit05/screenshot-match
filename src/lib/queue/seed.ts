/**
 * Deterministic demo data, built relative to "now" so every fresh start shows
 * the same situation: Adit mid-haircut with 10 minutes left and 2 waiting,
 * Bima free, Raka not checked in yet.
 */
import { DP_AMOUNT, MINUTE, PAYMENT_WINDOW_MINUTES, SERVICE } from "./config";
import { formatQueueNumber } from "./logic";
import type { Booking, BookingStatus, Capster, PaymentStatus, PaymentType, QueueState } from "./types";

export const STATE_VERSION = 3;

export const DEMO_CREDENTIALS = {
  admin: { username: "admin", password: "admin123" },
  capsters: [
    { capsterId: "adit", username: "adit", password: "adit123" },
    { capsterId: "bima", username: "bima", password: "bima123" },
    { capsterId: "raka", username: "raka", password: "raka123" },
  ],
} as const;

/** Use this number in the booking form to see the "already has an active booking" error. */
export const DEMO_DUPLICATE_PHONE = "081234567007";

export function orderIdFor(now: number, n: number): string {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now).replace(/-/g, "");
  return `CR-${d}-${String(n).padStart(4, "0")}`;
}

export function createSeed(now: number = Date.now()): QueueState {
  const capsters: Capster[] = [
    { id: "adit", name: "Adit", username: "adit", shift: "active", specialty: "Fade & undercut" },
    { id: "bima", name: "Bima", username: "bima", shift: "active", specialty: "Crop & textured" },
    { id: "raka", name: "Raka", username: "raka", shift: "inactive", specialty: "Klasik & pompadour" },
  ];

  let n = 0;
  const ago = (min: number) => now - min * MINUTE;

  const make = (o: {
    name: string;
    phone: string;
    capsterId: string;
    status: BookingStatus;
    payStatus: PaymentStatus;
    payType?: PaymentType;
    paidMinAgo: number | null;
    numbered?: boolean;
    promo?: boolean;
    calledMinAgo?: number;
    startedMinAgo?: number;
    completedMinAgo?: number;
    cancelledMinAgo?: number;
    cancelledBy?: "customer" | "shop";
    noShowMinAgo?: number;
  }): Booking => {
    n += 1;
    const createdAt = ago((o.paidMinAgo ?? 30) + 2);
    const numbered = o.numbered ?? o.paidMinAgo !== null;
    return {
      id: `bk-${String(n).padStart(3, "0")}`,
      queueNumber: null, // assigned below in paid order
      customerName: o.name,
      phone: o.phone,
      capsterId: o.capsterId,
      status: o.status,
      promoOptIn: o.promo ?? false,
      promoOptOutAt: null,
      createdAt,
      queuedAt: numbered && o.paidMinAgo !== null ? ago(o.paidMinAgo) : null,
      calledAt: o.calledMinAgo !== undefined ? ago(o.calledMinAgo) : null,
      startedAt: o.startedMinAgo !== undefined ? ago(o.startedMinAgo) : null,
      completedAt: o.completedMinAgo !== undefined ? ago(o.completedMinAgo) : null,
      cancelledAt: o.cancelledMinAgo !== undefined ? ago(o.cancelledMinAgo) : null,
      cancelledBy: o.cancelledBy ?? null,
      noShowAt: o.noShowMinAgo !== undefined ? ago(o.noShowMinAgo) : null,
      payment: {
        orderId: orderIdFor(now, n),
        amount: DP_AMOUNT,
        status: o.payStatus,
        type: o.payType ?? null,
        createdAt,
        expiresAt: createdAt + PAYMENT_WINDOW_MINUTES * MINUTE,
        paidAt: o.paidMinAgo !== null ? ago(o.paidMinAgo) : null,
      },
    };
  };

  const D = SERVICE.durationMinutes;
  const bookings: Booking[] = [
    make({ name: "Fajar", phone: "081234567001", capsterId: "bima", status: "completed", payStatus: "paid", payType: "qris", paidMinAgo: 170, calledMinAgo: 150, startedMinAgo: 148, completedMinAgo: 148 - D, promo: true }),
    make({ name: "Rizky", phone: "085712340002", capsterId: "adit", status: "completed", payStatus: "paid", payType: "gopay", paidMinAgo: 160, calledMinAgo: 125, startedMinAgo: 122, completedMinAgo: 122 - D, promo: true }),
    make({ name: "Dimas", phone: "081398760003", capsterId: "adit", status: "no_show", payStatus: "paid", payType: "qris", paidMinAgo: 140, calledMinAgo: 95, noShowMinAgo: 89 }),
    make({ name: "Yoga", phone: "082145670004", capsterId: "bima", status: "cancelled", payStatus: "paid", payType: "shopeepay", paidMinAgo: 120, cancelledMinAgo: 100, cancelledBy: "customer", promo: true }),
    make({ name: "Andi", phone: "087812340005", capsterId: "adit", status: "cancelled", payStatus: "refund_pending", payType: "bank_transfer", paidMinAgo: 110, cancelledMinAgo: 80, cancelledBy: "shop" }),
    make({ name: "Rendi", phone: "081311220006", capsterId: "bima", status: "cancelled", payStatus: "refunded", payType: "qris", paidMinAgo: 100, cancelledMinAgo: 90, cancelledBy: "shop", promo: false }),
    make({ name: "Hendra", phone: "089612340008", capsterId: "adit", status: "in_service", payStatus: "paid", payType: "qris", paidMinAgo: 70, calledMinAgo: 18, startedMinAgo: D - 10, promo: true }),
    make({ name: "Bayu", phone: DEMO_DUPLICATE_PHONE, capsterId: "adit", status: "waiting", payStatus: "paid", payType: "gopay", paidMinAgo: 45, promo: false }),
    make({ name: "Galih", phone: "085600990009", capsterId: "adit", status: "waiting", payStatus: "paid", payType: "qris", paidMinAgo: 20, promo: true }),
    make({ name: "Teguh", phone: "081277880010", capsterId: "bima", status: "payment_expired", payStatus: "expired", paidMinAgo: null, numbered: false }),
  ];

  // Assign A-001.. in paid order, like the server would at payment confirmation.
  const paid = bookings.filter((b) => b.queuedAt !== null).sort((a, b) => a.queuedAt! - b.queuedAt!);
  paid.forEach((b, i) => (b.queueNumber = formatQueueNumber(i + 1)));
  // Teguh created 30 min ago; its window has long expired.
  const teguh = bookings.find((b) => b.customerName === "Teguh")!;
  teguh.createdAt = ago(30);
  teguh.payment.createdAt = ago(30);
  teguh.payment.expiresAt = ago(30 - PAYMENT_WINDOW_MINUTES);

  // Promo opt-out record: customer previously opted in, then stopped.
  const rendi = bookings.find((b) => b.customerName === "Rendi")!;
  rendi.promoOptIn = false;
  rendi.promoOptOutAt = ago(60);

  return {
    version: STATE_VERSION,
    seededAt: now,
    shopOpen: true,
    capsters,
    bookings,
    queueCounter: paid.length,
    orderCounter: bookings.length,
    network: "normal",
    session: null,
    lastBookingId: null,
    lastSyncAt: now,
  };
}
