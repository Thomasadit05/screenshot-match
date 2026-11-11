import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Check, Clock, FlaskConical, Loader2, ShieldCheck, UserRoundX } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CapsterAvatar } from "@/components/queue/CapsterAvatar";
import { FeedGate } from "@/components/queue/FeedGate";
import { PublicHeader } from "@/components/queue/PublicHeader";
import { EmptyState, LoadingSkeleton } from "@/components/queue/States";
import { StatusBadge } from "@/components/queue/StatusBadge";
import { notify } from "@/components/queue/ToastNotification";
import { ApiError, createBooking } from "@/lib/queue/api";
import { DP_AMOUNT, NO_SHOW_TOLERANCE_MINUTES, PAYMENT_WINDOW_MINUTES, REMAINING_AMOUNT, SERVICE, SHOP } from "@/lib/queue/config";
import { useNow, useQueueData } from "@/lib/queue/feed";
import { capsterSummary, formatRupiah, validateBooking, type BookingErrors } from "@/lib/queue/logic";
import { DEMO_DUPLICATE_PHONE } from "@/lib/queue/seed";
import { getState } from "@/lib/queue/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/booking/$capsterId")({
  head: () => ({
    meta: [
      { title: "Form Booking — Cukur Rapi Barbershop" },
      { name: "description", content: "Isi nama panggilan dan nomor WhatsApp untuk mengambil antrean potong rambut." },
      { property: "og:title", content: "Form Booking — Cukur Rapi Barbershop" },
      { property: "og:description", content: "Isi data singkat lalu bayar DP Rp15.000 untuk mendapatkan nomor antrean." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingPage,
});

type Phase = "idle" | "loading" | "success" | "error";

function BookingPage() {
  const { capsterId } = Route.useParams();
  const state = useQueueData();
  const now = useNow(5000);
  const capster = state.capsters.find((c) => c.id === capsterId);

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-4 pt-5 pb-24">
        <Link to="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 mb-3")}>
          <ArrowLeft aria-hidden />
          Kembali pilih capster
        </Link>
        <h1 className="text-4xl font-extrabold uppercase">Form booking</h1>
        <p className="mt-1 text-sm text-muted-foreground">Hanya untuk antrean hari ini. Isi data singkat lalu bayar DP.</p>

        <div className="mt-5">
          <FeedGate skeleton={<LoadingSkeleton variant="ticket" />}>
            {!capster ? (
              <EmptyState
                icon={UserRoundX}
                title="Capster tidak ditemukan"
                description="Capster yang Anda pilih tidak tersedia. Silakan pilih capster lain di beranda."
                action={
                  <Link to="/" className={buttonVariants({ variant: "default" })}>
                    Ke Beranda
                  </Link>
                }
              />
            ) : (
              <BookingForm capsterId={capster.id} summary={capsterSummary(state, capster, now)} />
            )}
          </FeedGate>
        </div>
      </main>
    </div>
  );
}

function FieldError({ id, msg }: { id: string; msg?: string | undefined }) {
  if (!msg) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger-ink">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {msg}
    </p>
  );
}

function BookingForm({ capsterId, summary }: { capsterId: string; summary: ReturnType<typeof capsterSummary> }) {
  const navigate = useNavigate();
  const uid = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [promo, setPromo] = useState(false);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLButtonElement>(null);
  const formErrRef = useRef<HTMLDivElement>(null);

  const { capster } = summary;

  const focusFirst = (e: BookingErrors) => {
    if (e.form) formErrRef.current?.focus();
    else if (e.name) nameRef.current?.focus();
    else if (e.phone) phoneRef.current?.focus();
    else if (e.consent) consentRef.current?.focus();
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (phase === "loading") return;
    const input = { name, phone, consent, promoOptIn: promo };
    const local = validateBooking(getState(), capsterId, input);
    setErrors(local);
    if (Object.keys(local).length) {
      setPhase("error");
      focusFirst(local);
      setTimeout(() => setPhase("idle"), 1800);
      return;
    }
    setPhase("loading");
    try {
      const id = await createBooking(capsterId, input);
      setPhase("success");
      notify.success("Slot antrean ditahan", `Selesaikan pembayaran DP dalam ${PAYMENT_WINDOW_MINUTES} menit.`);
      setTimeout(() => void navigate({ to: "/bayar/$bookingId", params: { bookingId: id } }), 500);
    } catch (e) {
      setPhase("error");
      if (e instanceof ApiError && e.fieldErrors) {
        setErrors(e.fieldErrors);
        focusFirst(e.fieldErrors);
      } else {
        notify.fromError(e, "Booking gagal dibuat");
      }
      setTimeout(() => setPhase("idle"), 2200);
    }
  };

  const ids = {
    name: `${uid}-name`,
    phone: `${uid}-phone`,
    phoneHelp: `${uid}-phone-help`,
    consent: `${uid}-consent`,
    promo: `${uid}-promo`,
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <section aria-label="Capster dipilih" className="surface-card flex items-center gap-3 p-4">
        <CapsterAvatar name={capster.name} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Capster dipilih</p>
          <p className="font-display text-2xl leading-none font-bold">{capster.name}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            {summary.etaMinutes > 0 ? `Estimasi giliran ±${summary.etaMinutes} menit` : "Bisa langsung dilayani"}
            {" · "}
            {summary.waitingCount} menunggu
          </p>
        </div>
        <StatusBadge kind="capster" value={summary.status} />
      </section>

      {errors.form && (
        <div
          ref={formErrRef}
          tabIndex={-1}
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm font-medium text-danger-ink"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            {errors.form}
            <Link to="/" className="mt-1 block underline underline-offset-4">
              Kembali ke daftar capster
            </Link>
          </div>
        </div>
      )}

      <fieldset className="surface-card space-y-4 p-4 sm:p-5">
        <legend className="sr-only">Data pelanggan</legend>
        <div>
          <Label htmlFor={ids.name} className="text-sm font-semibold">
            Nama panggilan <span className="text-danger-ink">*</span>
          </Label>
          <Input
            ref={nameRef}
            id={ids.name}
            className="mt-1.5"
            autoComplete="given-name"
            placeholder="Contoh: Rangga"
            maxLength={20}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
            }}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${ids.name}-err` : undefined}
          />
          <FieldError id={`${ids.name}-err`} msg={errors.name} />
        </div>
        <div>
          <Label htmlFor={ids.phone} className="text-sm font-semibold">
            Nomor WhatsApp <span className="text-danger-ink">*</span>
          </Label>
          <Input
            ref={phoneRef}
            id={ids.phone}
            className="mt-1.5 tabular"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0812xxxxxxxx"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (errors.phone) setErrors((x) => ({ ...x, phone: undefined }));
            }}
            aria-invalid={!!errors.phone}
            aria-describedby={`${ids.phoneHelp}${errors.phone ? ` ${ids.phone}-err` : ""}`}
          />
          <p id={ids.phoneHelp} className="mt-1.5 text-xs text-muted-foreground">
            Diawali 08, 10–13 angka, tanpa spasi. Dipakai untuk info antrean, bukan ditampilkan ke publik.
          </p>
          <FieldError id={`${ids.phone}-err`} msg={errors.phone} />
        </div>
      </fieldset>

      <section aria-labelledby={`${uid}-ringkasan`} className="surface-card p-4 sm:p-5">
        <h2 id={`${uid}-ringkasan`} className="text-xl font-bold">
          Ringkasan pembayaran
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {SERVICE.name} (±{SERVICE.durationMinutes} menit)
            </dt>
            <dd className="font-medium tabular">{formatRupiah(SERVICE.price)}</dd>
          </div>
          <div className="flex justify-between rounded-md bg-bronze-soft px-2 py-1.5 font-semibold">
            <dt>DP {SERVICE.dpPercent}% dibayar sekarang</dt>
            <dd className="tabular">{formatRupiah(DP_AMOUNT)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Sisa dibayar di toko</dt>
            <dd className="font-medium tabular">{formatRupiah(REMAINING_AMOUNT)}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4">
        <div>
          <div className="flex items-start gap-3">
            <Checkbox
              ref={consentRef}
              id={ids.consent}
              checked={consent}
              onCheckedChange={(v) => {
                setConsent(v === true);
                if (errors.consent) setErrors((x) => ({ ...x, consent: undefined }));
              }}
              aria-invalid={!!errors.consent}
              aria-describedby={errors.consent ? `${ids.consent}-err` : undefined}
              className="mt-0.5"
            />
            <Label htmlFor={ids.consent} className="text-sm leading-relaxed font-normal">
              <span className="font-semibold">Wajib:</span> Saya setuju nama panggilan dan nomor WhatsApp saya digunakan
              untuk pengelolaan booking, pembayaran, antrean, dan komunikasi terkait kunjungan ini.
            </Label>
          </div>
          <FieldError id={`${ids.consent}-err`} msg={errors.consent} />
        </div>
        <div className="flex items-start gap-3">
          <Checkbox id={ids.promo} checked={promo} onCheckedChange={(v) => setPromo(v === true)} className="mt-0.5" />
          <Label htmlFor={ids.promo} className="text-sm leading-relaxed font-normal text-muted-foreground">
            <span className="font-semibold text-foreground">Opsional:</span> Saya bersedia menerima informasi promo,
            layanan, dan penawaran dari {SHOP.name} melalui WhatsApp. Saya dapat berhenti menerima promosi kapan saja.
          </Label>
        </div>
      </section>

      <section aria-label="Kebijakan" className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
        <h2 className="mb-2 flex items-center gap-2 font-sans text-sm font-bold">
          <ShieldCheck className="size-4 text-bronze-ink" aria-hidden />
          Kebijakan singkat
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            DP {formatRupiah(DP_AMOUNT)} mengunci nomor antrean dan dipotong dari harga layanan. Batas bayar{" "}
            {PAYMENT_WINDOW_MINUTES} menit.
          </li>
          <li>Pembatalan bisa dilakukan selama belum dipanggil, tetapi DP tidak dikembalikan.</li>
          <li>
            Setelah dipanggil, Anda punya toleransi {NO_SHOW_TOLERANCE_MINUTES} menit untuk hadir. Lewat dari itu dianggap
            tidak hadir dan DP hangus.
          </li>
          <li>Jika pembatalan berasal dari barbershop, DP dikembalikan penuh.</li>
        </ul>
      </section>

      <Button
        type="submit"
        size="xl"
        variant={phase === "success" ? "success" : phase === "error" ? "destructive" : "bronze"}
        className="w-full"
        disabled={phase === "loading" || phase === "success"}
        aria-busy={phase === "loading"}
      >
        {phase === "loading" ? (
          <>
            <Loader2 className="animate-spin" aria-hidden /> Menahan slot antrean…
          </>
        ) : phase === "success" ? (
          <>
            <Check aria-hidden /> Slot ditahan, membuka pembayaran…
          </>
        ) : phase === "error" ? (
          <>
            <AlertCircle aria-hidden /> Periksa kembali isian Anda
          </>
        ) : (
          <>Lanjut Bayar DP {formatRupiah(DP_AMOUNT)}</>
        )}
      </Button>

      <p className="flex items-start gap-2 rounded-md border border-dashed border-bronze/50 p-3 text-xs text-muted-foreground">
        <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-bronze-ink" aria-hidden />
        <span>
          Demo: nomor <button type="button" className="font-semibold text-foreground underline underline-offset-2" onClick={() => setPhone(DEMO_DUPLICATE_PHONE)}>{DEMO_DUPLICATE_PHONE}</button> sudah
          memiliki booking aktif. Gunakan panel Demo State untuk mencoba toko tutup atau kuota penuh.
        </span>
      </p>
    </form>
  );
}
