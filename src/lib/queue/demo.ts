/**
 * Demo-only controls used by the "Demo State" panel. Not part of the real API.
 */
import { DP_AMOUNT, MINUTE, NO_SHOW_TOLERANCE_MINUTES, PAYMENT_WINDOW_MINUTES } from "./config";
import { formatQueueNumber } from "./logic";
import { createSeed, orderIdFor } from "./seed";
import { getState, resetState, setState } from "./store";
import type { Booking, NetworkMode } from "./types";

export type Scenario = "default" | "closed" | "no_active" | "available" | "serving" | "full";

export const SCENARIOS: { id: Scenario; label: string; hint: string }[] = [
  { id: "default", label: "Data awal", hint: "Adit melayani, Bima kosong, Raka belum aktif" },
  { id: "closed", label: "Toko tutup", hint: "Booking dinonaktifkan" },
  { id: "no_active", label: "Toko buka, tanpa capster aktif", hint: "Semua capster belum aktif" },
  { id: "available", label: "Capster tersedia", hint: "Semua capster aktif tanpa antrean" },
  { id: "serving", label: "Capster sedang melayani", hint: "Adit & Bima sedang memotong" },
  { id: "full", label: "Antrean capster penuh", hint: "Kuota Adit penuh" },
];

const NAMES = ["Arif", "Bagas", "Cahyo", "Doni", "Eko", "Fikri", "Gilang", "Ilham"];

function extraWaiting(capsterId: string, count: number, startIndex: number, now: number) {
  const s = getState();
  const list: Booking[] = [];
  for (let i = 0; i < count; i++) {
    const n = s.orderCounter + 1 + i;
    const q = s.queueCounter + 1 + i;
    const paidAt = now - (10 - i) * MINUTE;
    list.push({
      id: `bk-demo-${capsterId}-${n}`,
      queueNumber: formatQueueNumber(q),
      customerName: NAMES[(startIndex + i) % NAMES.length],
      phone: `0819000${String(n).padStart(5, "0")}`,
      capsterId,
      status: "waiting",
      promoOptIn: i % 2 === 0,
      promoOptOutAt: null,
      createdAt: paidAt - MINUTE,
      queuedAt: paidAt,
      calledAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelledBy: null,
      noShowAt: null,
      payment: {
        orderId: orderIdFor(now, n),
        amount: DP_AMOUNT,
        status: "paid",
        type: "qris",
        createdAt: paidAt - MINUTE,
        expiresAt: paidAt + 9 * MINUTE,
        paidAt,
      },
    });
  }
  return list;
}

export function applyScenario(id: Scenario) {
  const now = Date.now();
  const session = getState().session;
  const network = getState().network;
  const base = { ...createSeed(now), session, network };
  setState(() => base);
  if (id === "default") return;

  setState((s) => {
    if (id === "closed") s.shopOpen = false;
    if (id === "no_active") s.capsters.forEach((c) => (c.shift = "inactive"));
    if (id === "available") {
      s.capsters.forEach((c) => (c.shift = "active"));
      s.bookings.forEach((b) => {
        if (b.status === "in_service") {
          b.status = "completed";
          b.completedAt = now - 2 * MINUTE;
        }
        if (b.status === "waiting") {
          b.status = "cancelled";
          b.cancelledBy = "shop";
          b.cancelledAt = now - 3 * MINUTE;
          b.payment.status = "refunded";
        }
      });
    }
    if (id === "serving") {
      const extra = extraWaiting("bima", 1, 0, now);
      extra[0].status = "in_service";
      extra[0].calledAt = now - 8 * MINUTE;
      extra[0].startedAt = now - 6 * MINUTE;
      s.bookings.push(...extra);
      s.orderCounter += 1;
      s.queueCounter += 1;
    }
    if (id === "full") {
      const extra = extraWaiting("adit", 2, 3, now);
      s.bookings.push(...extra);
      s.orderCounter += 2;
      s.queueCounter += 2;
    }
  });
}

export function setNetwork(mode: NetworkMode) {
  setState((s) => {
    s.network = mode;
  });
}

export function setShopOpenNow(open: boolean) {
  setState((s) => {
    s.shopOpen = open;
  });
}

export function setCapsterShiftNow(capsterId: string, shift: "inactive" | "active" | "finished") {
  setState((s) => {
    const c = s.capsters.find((x) => x.id === capsterId);
    if (c) c.shift = shift;
  });
}

/** Moves called_at back so the 5-minute tolerance is over (to test "Tidak Hadir"). */
export function skipTolerance() {
  setState((s) => {
    s.bookings.forEach((b) => {
      if (b.status === "waiting" && b.calledAt !== null) {
        b.calledAt = Math.min(b.calledAt, Date.now() - NO_SHOW_TOLERANCE_MINUTES * MINUTE - 1000);
      }
    });
  });
}

/** Moves the payment deadline so pending payments expire within ~10 seconds. */
export function fastForwardPayments() {
  setState((s) => {
    s.bookings.forEach((b) => {
      if (b.status === "payment_pending") {
        b.payment.expiresAt = Math.min(b.payment.expiresAt, Date.now() + 10_000);
      }
    });
  });
}

/** Creates a fresh payment_pending booking for Bima and returns its id. */
export function createDemoPendingBooking(): string {
  const now = Date.now();
  let id = "";
  setState((s) => {
    s.orderCounter += 1;
    id = `bk-pay-${s.orderCounter}`;
    s.bookings.push({
      id,
      queueNumber: null,
      customerName: "Satria",
      phone: `0821555${String(s.orderCounter).padStart(5, "0")}`,
      capsterId: "bima",
      status: "payment_pending",
      promoOptIn: false,
      promoOptOutAt: null,
      createdAt: now,
      queuedAt: null,
      calledAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelledBy: null,
      noShowAt: null,
      payment: {
        orderId: orderIdFor(now, s.orderCounter),
        amount: DP_AMOUNT,
        status: "pending",
        type: null,
        createdAt: now,
        expiresAt: now + PAYMENT_WINDOW_MINUTES * MINUTE,
        paidAt: null,
      },
    });
    s.lastBookingId = id;
  });
  return id;
}

/** Makes the next waiting customer of a capster "called" (for the ticket demo). */
export function callFirstWaiting(capsterId: string): string | null {
  let id: string | null = null;
  setState((s) => {
    const w = s.bookings
      .filter((b) => b.capsterId === capsterId && b.status === "waiting")
      .sort((a, b) => (a.queuedAt ?? 0) - (b.queuedAt ?? 0))[0];
    if (w) {
      w.calledAt = w.calledAt ?? Date.now();
      id = w.id;
    }
  });
  return id;
}

export { resetState };

export function demoLogin(session: import("./types").Session) {
  setState((s) => {
    s.session = session;
  });
}
