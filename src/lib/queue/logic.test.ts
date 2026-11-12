import { describe, expect, it } from "vitest";
import { DP_AMOUNT, MINUTE, REMAINING_AMOUNT } from "./config";
import {
  canMarkNoShow,
  canStartService,
  capsterSummary,
  etaIfBookNow,
  formatRupiah,
  isValidPhone,
  maskPhone,
  validateBooking,
} from "./logic";
import { createSeed, DEMO_DUPLICATE_PHONE } from "./seed";

const NOW = Date.UTC(2026, 10, 11, 7, 0, 0);

describe("harga & DP", () => {
  it("DP 30% dari Rp50.000 adalah Rp15.000, sisa Rp35.000", () => {
    expect(DP_AMOUNT).toBe(15_000);
    expect(REMAINING_AMOUNT).toBe(35_000);
    expect(formatRupiah(DP_AMOUNT)).toBe("Rp15.000");
  });
});

describe("estimasi", () => {
  it("Adit: sisa 10 menit + 2 menunggu × 25 = 60 menit", () => {
    expect(etaIfBookNow(createSeed(NOW), "adit", NOW)).toBe(60);
  });
  it("Bima tersedia sekarang (0 menit)", () => {
    const s = createSeed(NOW);
    const bima = capsterSummary(s, s.capsters.find((c) => c.id === "bima")!, NOW);
    expect(bima.etaMinutes).toBe(0);
    expect(bima.status).toBe("available");
  });
  it("Raka belum aktif tidak bisa dipilih", () => {
    const s = createSeed(NOW);
    expect(capsterSummary(s, s.capsters.find((c) => c.id === "raka")!, NOW).canBook).toBe(false);
  });
});

describe("WhatsApp", () => {
  it("validasi format 08…", () => {
    expect(isValidPhone("081234567890")).toBe(true);
    expect(isValidPhone("+6281234567890")).toBe(true);
    expect(isValidPhone("12345")).toBe(false);
  });
  it("nomor dimasking", () => {
    expect(maskPhone("081234567007")).toBe("0812****7007");
  });
});

describe("validasi booking", () => {
  const ok = { name: "Rangga", phone: "081299998888", consent: true, promoOptIn: false };
  it("nomor dengan booking aktif ditolak", () => {
    expect(validateBooking(createSeed(NOW), "bima", { ...ok, phone: DEMO_DUPLICATE_PHONE }).phone).toBeDefined();
  });
  it("persetujuan wajib", () => {
    expect(validateBooking(createSeed(NOW), "bima", { ...ok, consent: false }).consent).toBeDefined();
  });
  it("toko tutup menolak booking", () => {
    const s = createSeed(NOW);
    s.shopOpen = false;
    expect(validateBooking(s, "bima", ok).form).toBeDefined();
  });
  it("data valid lolos", () => {
    expect(validateBooking(createSeed(NOW), "bima", ok)).toEqual({});
  });
});

describe("aturan capster", () => {
  it("Tidak Hadir baru boleh setelah 5 menit dipanggil", () => {
    const b = createSeed(NOW).bookings.find((x) => x.status === "waiting")!;
    b.calledAt = NOW - 4 * MINUTE;
    expect(canMarkNoShow(b, NOW)).toBe(false);
    b.calledAt = NOW - 5 * MINUTE;
    expect(canMarkNoShow(b, NOW)).toBe(true);
  });
  it("tidak bisa mulai pelanggan kedua saat masih ada yang dilayani", () => {
    const s = createSeed(NOW);
    const waitingAdit = s.bookings.find((x) => x.status === "waiting" && x.capsterId === "adit")!;
    expect(canStartService(s, waitingAdit)).toBe(false);
  });
});
