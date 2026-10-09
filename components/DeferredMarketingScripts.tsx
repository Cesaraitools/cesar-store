"use client";

import { useEffect } from "react";

type QueuedFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  loaded?: boolean;
  push?: QueuedFunction;
  q?: unknown[][];
  queue?: unknown[][];
  version?: string;
};

type MarketingWindow = Window & {
  clarity?: QueuedFunction;
  dataLayer?: unknown[];
  fbq?: QueuedFunction;
  gtag?: (...args: unknown[]) => void;
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
};

type DeferredMarketingScriptsProps = {
  clarityProjectId?: string;
  googleConfigIds: string[];
  googleTagLoaderId?: string;
  metaPixelId?: string;
};

const FALLBACK_DELAY_MS = 60_000;

function appendExternalScript(id: string, src: string) {
  if (document.getElementById(id)) return;

  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export default function DeferredMarketingScripts({
  clarityProjectId,
  googleConfigIds,
  googleTagLoaderId,
  metaPixelId,
}: DeferredMarketingScriptsProps) {
  useEffect(() => {
    const marketingWindow = window as MarketingWindow;

    if (googleTagLoaderId) {
      marketingWindow.dataLayer = marketingWindow.dataLayer ?? [];
      marketingWindow.gtag =
        marketingWindow.gtag ??
        ((...args: unknown[]) => marketingWindow.dataLayer?.push(args));
      marketingWindow.gtag("js", new Date());
      googleConfigIds.forEach((id) => marketingWindow.gtag?.("config", id));
    }

    if (clarityProjectId && !marketingWindow.clarity) {
      const clarity: QueuedFunction = (...args: unknown[]) => {
        clarity.q = clarity.q ?? [];
        clarity.q.push(args);
      };
      marketingWindow.clarity = clarity;
    }

    if (metaPixelId && !marketingWindow.fbq) {
      const fbq: QueuedFunction = (...args: unknown[]) => {
        if (fbq.callMethod) {
          fbq.callMethod(...args);
          return;
        }

        fbq.queue = fbq.queue ?? [];
        fbq.queue.push(args);
      };
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.queue = [];
      fbq.push = fbq;
      marketingWindow.fbq = fbq;
      marketingWindow.fbq("init", metaPixelId);
      marketingWindow.fbq("track", "PageView");
    }

    let loaded = false;
    let idleCallbackId: number | undefined;
    const interactionEvents = [
      "pointerdown",
      "keydown",
      "touchstart",
    ] as const;

    const loadScripts = () => {
      if (loaded) return;
      loaded = true;

      if (googleTagLoaderId) {
        appendExternalScript(
          "google-tag-loader",
          `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
            googleTagLoaderId
          )}`
        );
      }
      if (clarityProjectId) {
        appendExternalScript(
          "microsoft-clarity-loader",
          `https://www.clarity.ms/tag/${encodeURIComponent(clarityProjectId)}`
        );
      }
      if (metaPixelId) {
        appendExternalScript(
          "meta-pixel-loader",
          "https://connect.facebook.net/en_US/fbevents.js"
        );
      }
    };

    const loadWhenIdle = () => {
      interactionEvents.forEach((eventName) =>
        window.removeEventListener(eventName, loadWhenIdle)
      );

      if (typeof marketingWindow.requestIdleCallback === "function") {
        idleCallbackId = marketingWindow.requestIdleCallback(loadScripts, {
          timeout: 3_000,
        });
        return;
      }

      globalThis.setTimeout(loadScripts, 1_000);
    };

    interactionEvents.forEach((eventName) =>
      window.addEventListener(eventName, loadWhenIdle, {
        once: true,
        passive: true,
      })
    );

    const fallbackTimer = window.setTimeout(loadScripts, FALLBACK_DELAY_MS);

    return () => {
      interactionEvents.forEach((eventName) =>
        window.removeEventListener(eventName, loadWhenIdle)
      );
      window.clearTimeout(fallbackTimer);
      if (
        idleCallbackId !== undefined &&
        typeof window.cancelIdleCallback === "function"
      ) {
        window.cancelIdleCallback(idleCallbackId);
      }
    };
  }, [clarityProjectId, googleConfigIds, googleTagLoaderId, metaPixelId]);

  return null;
}
