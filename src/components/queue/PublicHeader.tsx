import { Link } from "@tanstack/react-router";
import { Scissors } from "lucide-react";
import { SHOP } from "@/lib/queue/config";
import { useQueueState } from "@/lib/queue/store";
import { StatusBadge } from "./StatusBadge";

export function BrandMark({ to = "/" as const }: { to?: "/" }) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-md">
      <span className="grid size-9 place-items-center rounded-md bg-charcoal text-bronze">
        <Scissors className="size-5" aria-hidden />
      </span>
      <span className="font-display text-xl leading-none font-bold tracking-wide uppercase sm:text-2xl">
        {SHOP.shortName}
        <span className="block text-[0.65rem] font-semibold tracking-[0.25em] text-muted-foreground">Barbershop</span>
      </span>
    </Link>
  );
}

export function PublicHeader() {
  const { shopOpen } = useQueueState();
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <BrandMark />
        <div className="flex items-center gap-3 text-right">
          <div className="hidden text-xs text-muted-foreground sm:block">
            <p className="font-medium text-foreground">Buka setiap hari</p>
            <p className="tabular">
              {SHOP.openHour}–{SHOP.closeHour} WIB
            </p>
          </div>
          <StatusBadge kind="shop" value={shopOpen} size="md" />
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-12 border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          {SHOP.name} · {SHOP.address} · <span className="tabular">{SHOP.openHour}–{SHOP.closeHour} WIB</span>
        </p>
        <nav aria-label="Tautan lain" className="flex gap-4">
          <Link to="/display" className="underline-offset-4 hover:text-foreground hover:underline">
            Display Antrean
          </Link>
          <Link to="/login" className="underline-offset-4 hover:text-foreground hover:underline">
            Login Pegawai
          </Link>
        </nav>
      </div>
    </footer>
  );
}
