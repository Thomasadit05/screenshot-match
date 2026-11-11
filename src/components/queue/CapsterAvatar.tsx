import { cn } from "@/lib/utils";

export function CapsterAvatar({ name, size = "md", muted }: { name: string; size?: "sm" | "md" | "lg"; muted?: boolean }) {
  const s = size === "lg" ? "size-16 text-3xl" : size === "sm" ? "size-9 text-base" : "size-12 text-xl";
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-display font-bold",
        muted ? "bg-muted text-muted-foreground" : "bg-charcoal text-bronze",
        s,
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
