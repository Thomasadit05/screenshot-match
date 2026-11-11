/**
 * Pure business rules. No React, no storage — easy to port to a Laravel service class.
 */
import {
  MAX_WAITING_PER_CAPSTER,
  MINUTE,
  NO_SHOW_TOLERANCE_MINUTES,
  SERVICE,
  SHOP,
} from "./config";
import type { Booking, Capster, CapsterDisplayStatus, QueueState } from "./types";

/* ---------- formatting ---------- */

const rupiahFmt = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
export function formatRupiah(amount: number): string {
  // Intl outputs "Rp 50.000" with a NBSP; the brief uses "Rp50.000".
  return rupiahFmt.format(amount).replace(/\s/g, "");
}

export function formatTime(ts: number, withSeconds = false): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: SHOP.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
  })
    .format(ts)
    .replace(/\./g, ":");
}

export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: SHOP.timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(ts);
}

export function formatQueueNumber(n: number): string {
  return `A-${String(n).padStart(3, "0")}`;
}

/* ---------- phone ---------- */

export function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s\-().]/g, "");
  if (p.startsWith("+62")) p = "0" + p.slice(3);
  else if (p.startsWith("62")) p = "0" + p.slice(2);
  return p;
}

/** Indonesian mobile: 08xx, 10–13 digits total. */
export function isValidPhone(raw: string): boolean {
  return /^08[1-9]\d{7,10}$/.test(normalizePhone(raw));
}

/** 081234567007 -> 0812****7007 */
export function maskPhone(raw: string): string {
  const p = normalizePhone(raw);
  if (p.length < 8) return "****";
  return `${p.slice(0, 4)}${"*".repeat(Math.max(4, p.length - 8))}${p.slice(-4)}`;
}

/** Public displays only show a nickname's first word. */
export function publicName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/* ---------- queue ---------- */

export const ACTIVE_STATUSES = ["payment_pending", "waiting", "in_service"] as const;

export function isActiveBooking(b: Booking): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(b.status);
}

export function isCalled(b: Booking): boolean {
  return b.status === "waiting" && b.calledAt !== null;
}

/** Paid customers waiting for a capster, in queue order. */
export function waitingFor(state: Pick<QueueState, "bookings">, capsterId: string): Booking[] {
  return state.bookings
    .filter((b) => b.capsterId === capsterId && b.status === "waiting")
    .sort((a, b) => (a.queuedAt ?? 0) - (b.queuedAt ?? 0));
}

export function inServiceFor(state: Pick<QueueState, "bookings">, capsterId: string): Booking | null {
  return state.bookings.find((b) => b.capsterId === capsterId && b.status === "in_service") ?? null;
}

export function pendingHoldsFor(state: Pick<QueueState, "bookings">, capsterId: string): Booking[] {
  return state.bookings.filter(
    (b) => b.capsterId === capsterId && b.status === "payment_pending",
  );
}

/** Minutes left on the current haircut, never negative. */
export function remainingServiceMinutes(b: Booking | null, now: number): number {
  if (!b || b.startedAt === null) return 0;
  const elapsed = (now - b.startedAt) / MINUTE;
  return Math.max(0, Math.ceil(SERVICE.durationMinutes - elapsed));
}

/**
 * ETA if a customer books now:
 * sisa estimasi layanan aktif + jumlah pelanggan terbayar yang menunggu × durasi.
 */
export function etaIfBookNow(state: Pick<QueueState, "bookings">, capsterId: string, now: number): number {
  const remaining = remainingServiceMinutes(inServiceFor(state, capsterId), now);
  return remaining + waitingFor(state, capsterId).length * SERVICE.durationMinutes;
}

/** Position info for one waiting booking. */
export function positionOf(
  state: Pick<QueueState, "bookings">,
  booking: Booking,
  now: number,
): { ahead: number; etaMinutes: number } {
  if (booking.status !== "waiting") return { ahead: 0, etaMinutes: 0 };
  const queue = waitingFor(state, booking.capsterId);
  const idx = queue.findIndex((b) => b.id === booking.id);
  const waitingAhead = Math.max(0, idx);
  const serving = inServiceFor(state, booking.capsterId);
  const remaining = remainingServiceMinutes(serving, now);
  return {
    ahead: waitingAhead + (serving ? 1 : 0),
    etaMinutes: remaining + waitingAhead * SERVICE.durationMinutes,
  };
}

/** Quota counts paid waiting customers plus unexpired payment holds. */
export function quotaUsed(state: Pick<QueueState, "bookings">, capsterId: string): number {
  return waitingFor(state, capsterId).length + pendingHoldsFor(state, capsterId).length;
}

export function isCapsterFull(state: Pick<QueueState, "bookings">, capsterId: string): boolean {
  return quotaUsed(state, capsterId) >= MAX_WAITING_PER_CAPSTER;
}

export function capsterDisplayStatus(
  state: Pick<QueueState, "bookings">,
  capster: Capster,
): CapsterDisplayStatus {
  if (capster.shift === "inactive") return "inactive";
  if (capster.shift === "finished") return "finished";
  if (isCapsterFull(state, capster.id)) return "full";
  if (inServiceFor(state, capster.id)) return "serving";
  if (waitingFor(state, capster.id).length > 0) return "queued";
  return "available";
}

export function canBookCapster(state: QueueState, capster: Capster): boolean {
  return state.shopOpen && capster.shift === "active" && !isCapsterFull(state, capster.id);
}

/* ---------- capster actions rules ---------- */

export function toleranceEndsAt(b: Booking): number | null {
  return b.calledAt === null ? null : b.calledAt + NO_SHOW_TOLERANCE_MINUTES * MINUTE;
}

/** "Tidak Hadir" is allowed only after the 5-minute tolerance has passed. */
export function canMarkNoShow(b: Booking, now: number): boolean {
  const end = toleranceEndsAt(b);
  return isCalled(b) && end !== null && now >= end;
}

/** A capster can't start a second customer while one is still in service. */
export function canStartService(state: Pick<QueueState, "bookings">, b: Booking): boolean {
  return b.status === "waiting" && inServiceFor(state, b.capsterId) === null;
}

/* ---------- booking form validation ---------- */

export interface BookingInput {
  name: string;
  phone: string;
  consent: boolean;
  promoOptIn: boolean;
}

export type BookingErrors = Partial<Record<"name" | "phone" | "consent" | "form", string>>;

export function validateBooking(state: QueueState, capsterId: string, input: BookingInput): BookingErrors {
  const errors: BookingErrors = {};
  const capster = state.capsters.find((c) => c.id === capsterId);

  if (!state.shopOpen) {
    errors.form = "Toko sudah tutup. Booking hanya bisa dilakukan saat toko buka.";
  } else if (!capster || capster.shift !== "active") {
    errors.form = "Capster ini belum aktif atau sudah selesai bekerja. Silakan pilih capster lain.";
  } else if (isCapsterFull(state, capsterId)) {
    errors.form = `Kuota antrean ${capster.name} sudah penuh untuk saat ini. Silakan pilih capster lain atau coba lagi nanti.`;
  }

  const name = input.name.trim();
  if (!name) errors.name = "Nama panggilan wajib diisi.";
  else if (name.length < 2) errors.name = "Nama panggilan minimal 2 huruf.";
  else if (name.length > 20) errors.name = "Nama panggilan maksimal 20 karakter.";

  if (!input.phone.trim()) errors.phone = "Nomor WhatsApp wajib diisi.";
  else if (!isValidPhone(input.phone))
    errors.phone = "Format nomor tidak valid. Gunakan nomor yang diawali 08, contoh 081234567890.";
  else {
    const phone = normalizePhone(input.phone);
    const dup = state.bookings.find((b) => normalizePhone(b.phone) === phone && isActiveBooking(b));
    if (dup)
      errors.phone = dup.queueNumber
        ? `Nomor ini sudah memiliki booking aktif (${dup.queueNumber}). Satu nomor hanya bisa memiliki satu booking aktif.`
        : "Nomor ini masih memiliki pembayaran DP yang belum selesai. Selesaikan atau tunggu hingga kedaluwarsa.";
  }

  if (!input.consent)
    errors.consent = "Centang persetujuan ini agar kami dapat memproses booking Anda.";

  return errors;
}

/** Everything a capster card needs, computed in one place (maps to GET /api/capsters). */
export function capsterSummary(state: QueueState, capster: Capster, now: number) {
  const status = capsterDisplayStatus(state, capster);
  const serving = inServiceFor(state, capster.id);
  const canBook = canBookCapster(state, capster);
  const disabledReason = !state.shopOpen
    ? "Toko sedang tutup."
    : capster.shift === "inactive"
      ? "Capster belum aktif hari ini."
      : capster.shift === "finished"
        ? "Capster sudah selesai bekerja."
        : isCapsterFull(state, capster.id)
          ? "Kuota antrean penuh. Coba capster lain."
          : undefined;
  return {
    capster,
    status,
    serving,
    waitingCount: waitingFor(state, capster.id).length,
    remainingMinutes: remainingServiceMinutes(serving, now),
    etaMinutes: etaIfBookNow(state, capster.id, now),
    canBook,
    disabledReason,
  };
}
