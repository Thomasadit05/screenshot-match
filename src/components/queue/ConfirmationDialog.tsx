import { AlertTriangle, HelpCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ActionButton } from "./ActionButton";

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  confirmVariant?: ButtonProps["variant"];
  onConfirm: () => Promise<unknown>;
  onDone?: () => void;
  children?: ReactNode;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  tone = "default",
  confirmVariant,
  onConfirm,
  onDone,
  children,
}: Props) {
  const Icon = tone === "danger" ? AlertTriangle : HelpCircle;
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;
  const setOpen = (v: boolean) => {
    if (open === undefined) setInnerOpen(v);
    onOpenChange?.(v);
  };
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <span
            className={cn(
              "mb-1 grid size-10 place-items-center rounded-full",
              tone === "danger" ? "bg-danger-soft text-danger-ink" : "bg-bronze-soft text-bronze-ink",
            )}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} data-dialog-cancel>
            {cancelLabel}
          </Button>
          <ActionButton
            variant={confirmVariant ?? (tone === "danger" ? "destructive" : "default")}
            onAction={onConfirm}
            onSuccess={() => {
              setOpen(false);
              onDone?.();
            }}
          >
            {confirmLabel}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
