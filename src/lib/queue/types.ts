/**
 * Domain types for the barbershop queue prototype.
 * Field names mirror the planned Laravel JSON API (snake_case on the wire,
 * camelCase here). Timestamps are epoch milliseconds.
 */

export type BookingStatus =
  | "payment_pending"
  | "waiting"
  | "in_service"
  | "completed"
  | "cancelled"
  | "no_show"
  | "payment_expired";

export type PaymentStatus = "pending" | "paid" | "expired" | "failed" | "refund_pending" | "refunded";

export type PaymentType = "qris" | "gopay" | "bank_transfer" | "shopeepay";

/** Whether the capster has checked in for today. "serving" is derived from bookings. */
export type CapsterShift = "inactive" | "active" | "finished";

/** Status shown in the UI, derived from shift + bookings. */
export type CapsterDisplayStatus = "inactive" | "available" | "serving" | "queued" | "full" | "finished";

export interface Capster {
  id: string;
  name: string;
  username: string;
  shift: CapsterShift;
  specialty: string;
}

export interface Payment {
  orderId: string;
  amount: number;
  status: PaymentStatus;
  type: PaymentType | null;
  createdAt: number;
  expiresAt: number;
  paidAt: number | null;
}

export interface Booking {
  id: string;
  /** Daily queue number, assigned only after payment is paid. */
  queueNumber: string | null;
  customerName: string;
  phone: string;
  capsterId: string;
  status: BookingStatus;
  payment: Payment;
  promoOptIn: boolean;
  /** Set when a customer who opted in later asked to stop promotions. */
  promoOptOutAt: number | null;
  createdAt: number;
  /** Order in queue = paid time. */
  queuedAt: number | null;
  calledAt: number | null;
  startedAt: number | null;
  completedAt: number | null;
  cancelledAt: number | null;
  cancelledBy: "customer" | "shop" | null;
  noShowAt: number | null;
}

export type NetworkMode = "normal" | "slow" | "offline" | "server_error" | "empty";

export type Session = { role: "admin" } | { role: "capster"; capsterId: string } | null;

export interface QueueState {
  version: number;
  seededAt: number;
  shopOpen: boolean;
  capsters: Capster[];
  bookings: Booking[];
  /** Running counter for today's queue numbers (A-001 ...). */
  queueCounter: number;
  orderCounter: number;
  network: NetworkMode;
  session: Session;
  /** Last booking made from this browser, so the customer can return to the ticket. */
  lastBookingId: string | null;
  lastSyncAt: number;
}
