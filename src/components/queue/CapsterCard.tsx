import { Link } from "@tanstack/react-router";
import { Clock, Scissors, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { Capster, CapsterDisplayStatus } from "@/lib/queue/types";
import { cn } from "@/lib/utils";
import { CapsterAvatar } from "./CapsterAvatar";
import { StatusBadge } from "./StatusBadge";

export interface CapsterCardProps {
  capster: Capster;
  status: CapsterDisplayStatus;
  waitingCount: number;
  remainingMinutes: number;
  etaMinutes: number;
  canBook: boolean;
  disabledReason?: string | undefined;
}

export function CapsterCard({
  capster,
  status,
  waitingCount,
  remainingMinutes,
  etaMinutes,
  canBook,
  disabledReason,
}: CapsterCardProps) {
  const inactive = status === "inactive" || status === "finished";
  const headline =
    status === "serving"
      ? "Sedang potong rambut"
      : status === "full"
        ? "Antrean penuh"
        : status === "available"
          ? "Tersedia sekarang"
          : status === "queued"
            ? "Bersiap memanggil antrean"
            : status === "finished"
              ? "Sudah selesai bekerja hari ini"
              : "Belum hadir di toko";

  return (
    <article
      className={cn(
        "surface-card flex flex-col p-5 transition-shadow",
        canBook && "hover:shadow-lift",
        inactive && "bg-muted/50 shadow-none",
      )}
      aria-labelledby={`capster-${capster.id}`}
    >
      <header className="flex items-start gap-3">
        <CapsterAvatar name={capster.name} muted={inactive} />
        <div className="min-w-0 flex-1">
          <h3 id={`capster-${capster.id}`} className="font-display text-2xl leading-none font-bold">
            {capster.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{capster.specialty}</p>
        </div>
        <StatusBadge kind="capster" value={status} />
      </header>

      <p className={cn("mt-4 font-semibold", status === "available" && "text-success-ink")}>{headline}</p>

      {!inactive && (
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          {status === "serving" && remainingMinutes > 0 && (
            <li className="flex items-center gap-2">
              <Scissors className="size-4 text-bronze-ink" aria-hidden />
              Sisa layanan saat ini ±{remainingMinutes} menit
            </li>
          )}
          <li className="flex items-center gap-2">
            <Users className="size-4 text-bronze-ink" aria-hidden />
            {waitingCount > 0 ? `${waitingCount} pelanggan menunggu` : "Belum ada pelanggan menunggu"}
          </li>
          <li className="flex items-center gap-2">
            <Clock className="size-4 text-bronze-ink" aria-hidden />
            {etaMinutes > 0 ? (
              <span>
                Estimasi giliran <strong className="text-foreground tabular">±{etaMinutes} menit</strong>
              </span>
            ) : (
              <strong className="text-success-ink">Bisa langsung dilayani</strong>
            )}
          </li>
        </ul>
      )}

      <div className="mt-auto pt-5">
        {canBook ? (
          <Link
            to="/booking/$capsterId"
            params={{ capsterId: capster.id }}
            className={cn(buttonVariants({ variant: status === "available" ? "bronze" : "default", size: "lg" }), "w-full")}
          >
            Pilih Capster {capster.name}
          </Link>
        ) : (
          <>
            <button type="button" disabled className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
              Tidak bisa dipilih
            </button>
            {disabledReason && <p className="mt-2 text-center text-xs text-muted-foreground">{disabledReason}</p>}
          </>
        )}
      </div>
    </article>
  );
}
