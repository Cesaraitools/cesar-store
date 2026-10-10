"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { TOASTER_REQUEST_EVENT } from "@/lib/client-toast";

const Toaster = dynamic(
  () => import("react-hot-toast").then((module) => module.Toaster),
  { ssr: false }
);

const HOMEPAGE_FALLBACK_DELAY_MS = 60_000;

export default function DeferredToaster() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(pathname !== "/");

  useEffect(() => {
    if (pathname !== "/") {
      setMounted(true);
      return;
    }

    const mount = () => setMounted(true);
    const interactionEvents = ["pointerdown", "keydown", "touchstart"] as const;

    window.addEventListener(TOASTER_REQUEST_EVENT, mount, { once: true });
    interactionEvents.forEach((eventName) =>
      window.addEventListener(eventName, mount, { once: true, passive: true })
    );
    const fallbackTimer = window.setTimeout(mount, HOMEPAGE_FALLBACK_DELAY_MS);

    return () => {
      window.removeEventListener(TOASTER_REQUEST_EVENT, mount);
      interactionEvents.forEach((eventName) =>
        window.removeEventListener(eventName, mount)
      );
      window.clearTimeout(fallbackTimer);
    };
  }, [pathname]);

  if (!mounted) return null;

  return (
    <Toaster
      position="top-center"
      containerStyle={{ zIndex: 2147483647 }}
      toastOptions={{ duration: 3000 }}
    />
  );
}
