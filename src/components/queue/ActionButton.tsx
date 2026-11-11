import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notify } from "./ToastNotification";

type Phase = "idle" | "loading" | "success" | "error";

interface Props extends Omit<ButtonProps, "onClick" | "children"> {
  onAction: () => Promise<unknown>;
  children: ReactNode;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  /** Toast title shown on failure; set false to handle errors yourself. */
  errorToast?: string | false;
  onSuccess?: () => void;
  onError?: (e: unknown) => void;
}

/**
 * Button with built-in loading, success and error feedback.
 * Hover/focus/disabled come from the Button variants.
 */
export function ActionButton({
  onAction,
  children,
  loadingText = "Memproses…",
  successText = "Berhasil",
  errorText = "Gagal, coba lagi",
  errorToast = "Tindakan gagal",
  onSuccess,
  onError,
  disabled,
  className,
  variant,
  ...rest
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const settle = (p: Phase, ms: number) => {
    setPhase(p);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase("idle"), ms);
  };

  const run = async () => {
    if (phase === "loading") return;
    setPhase("loading");
    try {
      await onAction();
      settle("success", 1400);
      onSuccess?.();
    } catch (e) {
      settle("error", 2200);
      if (errorToast !== false) notify.fromError(e, errorToast);
      onError?.(e);
    }
  };

  const content =
    phase === "loading" ? (
      <>
        <Loader2 className="animate-spin" aria-hidden />
        {loadingText}
      </>
    ) : phase === "success" ? (
      <>
        <Check aria-hidden />
        {successText}
      </>
    ) : phase === "error" ? (
      <>
        <AlertCircle aria-hidden />
        {errorText}
      </>
    ) : (
      children
    );

  return (
    <Button
      {...rest}
      variant={phase === "success" ? "success" : phase === "error" ? "destructive" : variant}
      disabled={disabled || phase === "loading"}
      aria-busy={phase === "loading"}
      data-phase={phase}
      onClick={run}
      className={cn(className)}
    >
      {content}
      <span className="sr-only" aria-live="polite">
        {phase === "loading" ? loadingText : phase === "success" ? successText : phase === "error" ? errorText : ""}
      </span>
    </Button>
  );
}
