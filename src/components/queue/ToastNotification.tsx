import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ApiError } from "@/lib/queue/api";

/** Single place for app toasts so wording and styling stay consistent. */
export const notify = {
  success: (title: string, description?: string) => toast.success(title, { description }),
  info: (title: string, description?: string) => toast(title, { description }),
  warning: (title: string, description?: string) => toast.warning(title, { description }),
  error: (title: string, description?: string) => toast.error(title, { description }),
  fromError: (e: unknown, fallback = "Terjadi kesalahan") => {
    const msg = e instanceof Error ? e.message : String(e);
    const title =
      e instanceof ApiError && e.kind === "offline"
        ? "Koneksi terputus"
        : e instanceof ApiError && e.kind === "server"
          ? "Server bermasalah"
          : fallback;
    toast.error(title, { description: msg });
  },
};

export function ToastNotification() {
  return <Toaster position="top-center" richColors closeButton />;
}
