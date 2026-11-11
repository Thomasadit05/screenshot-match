/** Static business configuration. In Laravel this comes from config/settings tables. */

export const SHOP = {
  name: "Cukur Rapi Barbershop",
  shortName: "Cukur Rapi",
  address: "Jl. Kaliurang Km 5, Yogyakarta",
  openHour: "10.00",
  closeHour: "21.00",
  timeZone: "Asia/Jakarta",
} as const;

export const SERVICE = {
  name: "Potong Rambut",
  price: 50_000,
  durationMinutes: 25,
  dpPercent: 30,
} as const;

export const DP_AMOUNT = Math.round((SERVICE.price * SERVICE.dpPercent) / 100);
export const REMAINING_AMOUNT = SERVICE.price - DP_AMOUNT;

/** Minutes the customer has to show up after being called. */
export const NO_SHOW_TOLERANCE_MINUTES = 5;
/** Minutes to complete payment before the slot is released. */
export const PAYMENT_WINDOW_MINUTES = 10;
/** Max people waiting (paid + pending payment holds) per capster. */
export const MAX_WAITING_PER_CAPSTER = 4;
/** Polling interval used to simulate live updates. */
export const POLL_INTERVAL_MS = 5_000;

export const MINUTE = 60_000;
