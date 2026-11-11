import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "bronze" | "dark";
  hint?: string;
}

const iconTone = {
  default: "bg-muted text-foreground",
  success: "bg-success-soft text-success-ink",
  warning: "bg-warning-soft text-warning-ink",
  danger: "bg-danger-soft text-danger-ink",
  bronze: "bg-bronze-soft text-bronze-ink",
  dark: "bg-charcoal text-cream",
};

export function SummaryCard({ label, value, icon: Icon, tone = "default", hint }: Props) {
  return (
    <div className="surface-card flex items-start gap-3 p-4">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", iconTone[tone])}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-display text-3xl leading-tight font-bold tabular">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
