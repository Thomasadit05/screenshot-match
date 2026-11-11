import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lift group-[.toaster]:font-sans",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:!bg-success-soft group-[.toaster]:!text-success-ink group-[.toaster]:!border-success/30",
          error: "group-[.toaster]:!bg-danger-soft group-[.toaster]:!text-danger-ink group-[.toaster]:!border-danger/30",
          warning: "group-[.toaster]:!bg-warning-soft group-[.toaster]:!text-warning-ink group-[.toaster]:!border-warning/30",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
