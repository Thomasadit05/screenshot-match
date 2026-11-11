/**
 * Mock JSON API. Each function maps to a planned Laravel endpoint (see comments)
 * and simulates latency plus the network mode chosen in the Demo State panel.
 * UI code only talks to this module, never to the store directly for writes.
 */
import { DP_AMOUNT, MINUTE, PAYMENT_WINDOW_MINUTES } from "./config";
import {
  canMarkNoShow,
  canStartService,
  formatQueueNumber,
  inServiceFor,
  isCalled,
  normalizePhone,
  validateBooking,
  waitingFor,
  type BookingErrors,
  type BookingInput,
} from "./logic";
import { DEMO_CREDENTIALS, orderIdFor } from "./seed";
import { getState, setState } from "./store";
import type { Booking, PaymentType, QueueState, Session } from "./types";

export type ApiErrorKind = "offline" | "server" | "validation" | "conflict" | "auth";

export class ApiError extends Error {
  kind: ApiErrorKind;
  fieldErrors?: BookingErrors | undefined;
  constructor(kind: ApiErrorKind, message: string, fieldErrors?: BookingErrors) {
    super(message);
    this.kind = kind;
    this.fieldErrors = fieldErrors;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request(minMs = 450, maxMs = 800) {
  const { network } = getState();
  const base = minMs + Math.random() * (maxMs - minMs);
  await sleep(network === "slow" ? base + 1800 : base);
  const after = getState().network;
  if (after === "offline")
    throw new ApiError("offline", "Koneksi terputus. Periksa internet Anda lalu coba lagi.");
  if (after === "server_error")
    throw new ApiError("server", "Server sedang bermasalah (500). Coba lagi beberapa saat.");
}

function findBooking(s: QueueState, id: string): Booking {
  const b = s.bookings.find((x) => x.id === id);
  if (!b) throw new ApiError("conflict", "Booking tidak ditemukan.");
  return b;
}

/** Releases unpaid holds whose 10-minute window is over. Runs on every poll. */
export function expireStalePayments(now = Date.now()) {
  const stale = getState().bookings.some(
    (b) => b.status === "payment_pending" && b.payment.expiresAt <= now,
  );
  if (!stale) return;
  setState((s) => {
    s.bookings.forEach((b) => {
      if (b.status === "payment_pending" && b.payment.expiresAt <= now) {
        b.status = "payment_expired";
        b.payment.status = "expired";
      }
    });
  });
}

/* ---------- public ---------- */

/** GET /api/queue/snapshot */
export async function poll() {
  await request(250, 500);
  expireStalePayments();
  setState((s) => {
    s.lastSyncAt = Date.now();
  });
}

/** POST /api/bookings */
export async function createBooking(capsterId: string, input: BookingInput): Promise<string> {
  await request(500, 900);
  const errors = validateBooking(getState(), capsterId, input);
  if (Object.keys(errors).length > 0) {
    throw new ApiError("validation", errors.form ?? "Periksa kembali isian Anda.", errors);
  }
  const now = Date.now();
  let id = "";
  setState((s) => {
    s.orderCounter += 1;
    id = `bk-${String(s.orderCounter).padStart(3, "0")}-${now.toString(36).slice(-4)}`;
    s.bookings.push({
      id,
      queueNumber: null,
      customerName: input.name.trim(),
      phone: normalizePhone(input.phone),
      capsterId,
      status: "payment_pending",
      promoOptIn: input.promoOptIn,
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

export type PaymentOutcome = "success" | "pending" | "failed" | "expired";

/**
 * Simulates the Midtrans notification webhook. Success is only applied after
 * a "server verification" round-trip, then a queue number is assigned.
 * POST /api/payments/midtrans/notification (sandbox)
 */
export async function simulatePayment(bookingId: string, outcome: PaymentOutcome) {
  await request(outcome === "success" ? 1600 : 600, outcome === "success" ? 2200 : 900);
  const current = findBooking(getState(), bookingId);
  if (current.status !== "payment_pending") {
    throw new ApiError("conflict", "Pembayaran ini sudah tidak aktif. Silakan buat booking baru.");
  }
  if (current.payment.expiresAt <= Date.now()) {
    expireStalePayments();
    throw new ApiError("conflict", "Waktu pembayaran sudah habis. Slot antrean telah dilepas.");
  }
  setState((s) => {
    const b = findBooking(s, bookingId);
    const types: PaymentType[] = ["qris", "gopay", "shopeepay", "bank_transfer"];
    if (outcome === "success") {
      s.queueCounter += 1;
      b.queueNumber = formatQueueNumber(s.queueCounter);
      b.status = "waiting";
      b.queuedAt = Date.now();
      b.payment.status = "paid";
      b.payment.paidAt = Date.now();
      b.payment.type = types[s.queueCounter % types.length] ?? "qris";
    } else if (outcome === "pending") {
      b.payment.type = "bank_transfer";
    } else if (outcome === "failed") {
      b.status = "payment_expired";
      b.payment.status = "failed";
      b.payment.type = "qris";
    } else {
      b.status = "payment_expired";
      b.payment.status = "expired";
    }
  });
}

/** POST /api/bookings/{id}/cancel — customer, only while waiting and not yet called. */
export async function cancelByCustomer(bookingId: string) {
  await request();
  setState((s) => {
    const b = findBooking(s, bookingId);
    if (b.status !== "waiting" || b.calledAt !== null)
      throw new ApiError("conflict", "Booking tidak bisa dibatalkan karena Anda sudah dipanggil.");
    b.status = "cancelled";
    b.cancelledAt = Date.now();
    b.cancelledBy = "customer";
  });
}

/* ---------- staff auth ---------- */

/** POST /login */
export async function login(username: string, password: string): Promise<Session> {
  await request(500, 800);
  const u = username.trim().toLowerCase();
  let session: Session = null;
  if (u === DEMO_CREDENTIALS.admin.username && password === DEMO_CREDENTIALS.admin.password) {
    session = { role: "admin" };
  } else {
    const c = DEMO_CREDENTIALS.capsters.find((x) => x.username === u && x.password === password);
    if (c) session = { role: "capster", capsterId: c.capsterId };
  }
  if (!session) throw new ApiError("auth", "Username atau password salah. Periksa kembali lalu coba lagi.");
  setState((s) => {
    s.session = session;
  });
  return session;
}

export function logout() {
  setState((s) => {
    s.session = null;
  });
}

/* ---------- admin ---------- */

/** PATCH /api/admin/shop */
export async function setShopOpen(open: boolean) {
  await request();
  setState((s) => {
    s.shopOpen = open;
  });
}

/** POST /api/admin/bookings/{id}/cancel — shop-initiated, DP becomes refundable. */
export async function adminCancel(bookingId: string) {
  await request();
  setState((s) => {
    const b = findBooking(s, bookingId);
    if (!["waiting", "payment_pending"].includes(b.status))
      throw new ApiError("conflict", "Hanya booking yang masih menunggu yang bisa dibatalkan.");
    if (b.status === "payment_pending") {
      b.status = "payment_expired";
      b.payment.status = "expired";
    } else {
      b.status = "cancelled";
    }
    b.cancelledAt = Date.now();
    b.cancelledBy = "shop";
  });
}

/** POST /api/admin/bookings/{id}/refund */
export async function requestRefund(bookingId: string) {
  await request();
  setState((s) => {
    const b = findBooking(s, bookingId);
    if (b.payment.status !== "paid" || b.status !== "cancelled")
      throw new ApiError("conflict", "Refund hanya untuk booking terbayar yang sudah dibatalkan.");
    b.payment.status = "refund_pending";
  });
}

/** POST /api/admin/bookings/{id}/refund/complete */
export async function completeRefund(bookingId: string) {
  await request();
  setState((s) => {
    const b = findBooking(s, bookingId);
    if (b.payment.status !== "refund_pending")
      throw new ApiError("conflict", "Refund ini tidak sedang diproses.");
    b.payment.status = "refunded";
  });
}

/** PATCH /api/admin/promo-contacts/{id} */
export async function setPromoOptOut(bookingId: string) {
  await request();
  setState((s) => {
    const b = findBooking(s, bookingId);
    b.promoOptIn = false;
    b.promoOptOutAt = Date.now();
  });
}

/* ---------- capster ---------- */

/** PATCH /api/capster/shift */
export async function setCapsterShift(capsterId: string, shift: "active" | "finished") {
  await request();
  setState((s) => {
    const c = s.capsters.find((x) => x.id === capsterId);
    if (!c) throw new ApiError("conflict", "Capster tidak ditemukan.");
    if (shift === "finished" && inServiceFor(s, capsterId))
      throw new ApiError("conflict", "Selesaikan pelanggan yang sedang dilayani sebelum selesai kerja.");
    c.shift = shift;
  });
}

/** POST /api/capster/bookings/{id}/call */
export async function callBooking(bookingId: string) {
  await request();
  setState((s) => {
    const b = findBooking(s, bookingId);
    if (b.status !== "waiting") throw new ApiError("conflict", "Pelanggan ini tidak sedang menunggu.");
    const alreadyCalled = waitingFor(s, b.capsterId).find((x) => isCalled(x) && x.id !== b.id);
    if (alreadyCalled)
      throw new ApiError("conflict", `${alreadyCalled.queueNumber} masih dalam status dipanggil.`);
    b.calledAt = Date.now();
  });
}

/** POST /api/capster/bookings/{id}/start */
export async function startService(bookingId: string) {
  await request();
  setState((s) => {
    const b = findBooking(s, bookingId);
    if (!canStartService(s, b))
      throw new ApiError("conflict", "Masih ada pelanggan yang sedang dilayani. Selesaikan dulu.");
    b.status = "in_service";
    b.calledAt = b.calledAt ?? Date.now();
    b.startedAt = Date.now();
  });
}

/** POST /api/capster/bookings/{id}/complete */
export async function completeService(bookingId: string) {
  await request();
  setState((s) => {
    const b = findBooking(s, bookingId);
    if (b.status !== "in_service") throw new ApiError("conflict", "Pelanggan ini tidak sedang dilayani.");
    b.status = "completed";
    b.completedAt = Date.now();
  });
}

/** POST /api/capster/bookings/{id}/no-show */
export async function markNoShow(bookingId: string) {
  await request();
  setState((s) => {
    const b = findBooking(s, bookingId);
    if (!canMarkNoShow(b, Date.now()))
      throw new ApiError("conflict", "Tidak Hadir baru bisa ditandai setelah toleransi 5 menit habis.");
    b.status = "no_show";
    b.noShowAt = Date.now();
  });
}
