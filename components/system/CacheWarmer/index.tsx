"use client";

// Asks the service worker to pre-fetch and cache the documents for a set
// of routes while we still have a network.
//
// Why this is needed: reaching /workout/{id} is always a client-side
// router push, which fetches an RSC payload, not a document. The service
// worker's navigation cache only fills on real navigations, so the one
// navigation that matters — relaunching the installed PWA into an active
// workout with no signal — always missed and landed on /offline. Warming
// puts the document in the cache ahead of that moment.
//
// Renders nothing. No-ops when there is no service worker (development,
// unsupported browsers) or when we are already offline.

import { useEffect, type JSX } from "react";

const postWarm = async (urls: string[]): Promise<void> => {
  if (typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!navigator.onLine) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const worker = navigator.serviceWorker.controller ?? registration.active;
    worker?.postMessage({ type: "warm-routes", urls });
  } catch {
    // No registration to talk to. Nothing to warm.
  }
};

type CacheWarmerProps = {
  urls: readonly string[];
};

export const CacheWarmer = ({ urls }: CacheWarmerProps): JSX.Element | null => {
  // Depend on the joined string, not the array identity — callers build
  // the list inline and would otherwise re-warm on every render.
  const key = urls.join(" ");

  useEffect(() => {
    const list = key.split(" ").filter((u) => u !== "");
    void postWarm(list);

    // Same triggers QueueSyncer drains on, and for the same reason: these
    // are the moments the cached copy is cheapest to refresh and most
    // likely to matter next. Re-warming after a drain also matters for
    // completeness — a warm taken before the queue reached the server
    // stores a document whose *server-only* extras (last session, PRs)
    // aren't populated yet.
    const onOnline = (): void => {
      void postWarm(list);
    };
    const onVisibility = (): void => {
      if (document.visibilityState === "visible") void postWarm(list);
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [key]);

  return null;
};
