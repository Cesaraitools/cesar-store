import type { ToastOptions } from "react-hot-toast";

type ToastId = string;

const TOASTER_REQUEST_EVENT = "cesar:toaster-request";

function requestToaster() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TOASTER_REQUEST_EVENT));
  }
}

async function loadToast() {
  requestToaster();
  const { default: toast } = await import("react-hot-toast");
  return toast;
}

export { TOASTER_REQUEST_EVENT };

export async function showSuccessToast(
  message: string,
  options?: ToastOptions
): Promise<ToastId> {
  const toast = await loadToast();
  return toast.success(message, options);
}

export async function showErrorToast(
  message: string,
  options?: ToastOptions
): Promise<ToastId> {
  const toast = await loadToast();
  return toast.error(message, options);
}

export async function dismissToast(id: ToastId | Promise<ToastId>) {
  const [toast, resolvedId] = await Promise.all([loadToast(), id]);
  toast.dismiss(resolvedId);
}
