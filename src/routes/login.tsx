import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Check, Loader2, LogIn, ShieldCheck, Scissors } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/queue/PublicHeader";
import { ApiError, login } from "@/lib/queue/api";
import { DEMO_CREDENTIALS } from "@/lib/queue/seed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login Pegawai — Cukur Rapi Barbershop" },
      { name: "description", content: "Masuk sebagai admin atau capster untuk mengelola antrean hari ini." },
      { property: "og:title", content: "Login Pegawai — Cukur Rapi Barbershop" },
      { property: "og:description", content: "Halaman masuk khusus admin dan capster." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

type Phase = "idle" | "loading" | "success" | "error";

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ username?: string | undefined; password?: string | undefined }>({});
  const [phase, setPhase] = useState<Phase>("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const fe = {
      username: username.trim() ? undefined : "Username wajib diisi.",
      password: password ? undefined : "Password wajib diisi.",
    };
    setFieldErr(fe);
    setError(null);
    if (fe.username || fe.password) return;
    setPhase("loading");
    try {
      const session = await login(username, password);
      setPhase("success");
      setTimeout(() => void navigate({ to: session?.role === "admin" ? "/admin" : "/capster" }), 400);
    } catch (err) {
      setPhase("error");
      setError(err instanceof ApiError ? err.message : "Login gagal. Coba lagi.");
      setTimeout(() => setPhase("idle"), 1800);
    }
  };

  const fill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
    setFieldErr({});
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>
        <form onSubmit={submit} noValidate className="surface-card space-y-4 p-5 sm:p-6">
          <div>
            <h1 className="text-3xl font-extrabold uppercase">Login pegawai</h1>
            <p className="text-sm text-muted-foreground">Khusus admin dan capster. Akun dibuat oleh admin.</p>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm font-medium text-danger-ink">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="username" className="font-semibold">Username</Label>
            <Input
              id="username"
              className="mt-1.5"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={!!fieldErr.username || !!error}
              aria-describedby={fieldErr.username ? "username-err" : undefined}
            />
            {fieldErr.username && <p id="username-err" className="mt-1 text-sm font-medium text-danger-ink">{fieldErr.username}</p>}
          </div>
          <div>
            <Label htmlFor="password" className="font-semibold">Password</Label>
            <Input
              id="password"
              type="password"
              className="mt-1.5"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErr.password || !!error}
              aria-describedby={fieldErr.password ? "password-err" : undefined}
            />
            {fieldErr.password && <p id="password-err" className="mt-1 text-sm font-medium text-danger-ink">{fieldErr.password}</p>}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            variant={phase === "success" ? "success" : phase === "error" ? "destructive" : "default"}
            disabled={phase === "loading" || phase === "success"}
            aria-busy={phase === "loading"}
          >
            {phase === "loading" ? <><Loader2 className="animate-spin" aria-hidden /> Memeriksa akun…</>
              : phase === "success" ? <><Check aria-hidden /> Berhasil masuk</>
              : phase === "error" ? <><AlertCircle aria-hidden /> Login gagal</>
              : <><LogIn aria-hidden /> Masuk</>}
          </Button>

          <div className="border-t border-dashed border-input pt-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">Masuk cepat (demo)</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fill(DEMO_CREDENTIALS.admin.username, DEMO_CREDENTIALS.admin.password)}>
                <ShieldCheck aria-hidden /> Admin
              </Button>
              {DEMO_CREDENTIALS.capsters.map((c) => (
                <Button key={c.username} type="button" variant="outline" size="sm" onClick={() => fill(c.username, c.password)}>
                  <Scissors aria-hidden /> Capster {c.username[0]!.toUpperCase() + c.username.slice(1)}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Tombol mengisi username & password demo. Coba password salah untuk melihat pesan gagal.
            </p>
          </div>
        </form>
        <Link to="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-4")}>
          <ArrowLeft aria-hidden /> Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
