import { Link, useNavigate } from "@tanstack/react-router";
import { useHydrated } from "@tanstack/react-router";
import { LogIn, LogOut, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { logout } from "@/lib/queue/api";
import { useQueueState } from "@/lib/queue/store";
import type { Session } from "@/lib/queue/types";
import { BrandMark } from "./PublicHeader";
import { EmptyState, LoadingSkeleton } from "./States";

export function StaffShell({
  role,
  children,
  title,
}: {
  role: "admin" | "capster";
  title: string;
  children: (session: NonNullable<Session>) => ReactNode;
}) {
  const hydrated = useHydrated();
  const { session } = useQueueState();
  const navigate = useNavigate();
  const allowed = session && session.role === role;

  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-3 bg-charcoal text-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 [&_a]:text-cream [&_.text-muted-foreground]:text-cream/60">
            <BrandMark />
            <span className="hidden rounded border border-bronze/60 px-2 py-0.5 text-xs font-semibold text-bronze sm:inline">
              {title}
            </span>
          </div>
          {allowed && (
            <Button
              variant="ghost-dark"
              size="sm"
              onClick={() => {
                logout();
                void navigate({ to: "/login" });
              }}
            >
              <LogOut aria-hidden />
              Keluar
            </Button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-5 pb-24">
        {!hydrated ? (
          <LoadingSkeleton />
        ) : !allowed ? (
          <EmptyState
            icon={Lock}
            title="Perlu login pegawai"
            description={
              session
                ? `Akun ini tidak punya akses ke ${title}.`
                : `Halaman ${title} hanya untuk pegawai. Silakan login terlebih dahulu.`
            }
            action={
              <Link to="/login" className={buttonVariants({ size: "lg" })}>
                <LogIn aria-hidden />
                Ke Halaman Login
              </Link>
            }
          />
        ) : (
          children(session)
        )}
      </main>
    </div>
  );
}
