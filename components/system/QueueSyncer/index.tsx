"use client";

// Mounts in the (app) layout once and listens for moments when it makes
// sense to drain the write queue:
//   - on mount (catches anything that was enqueued while the tab was
//     closed or the last drain failed)
//   - on the online event (network came back)
//   - on the visibilitychange event to "visible" (user returned to the
//     tab; common case on mobile switching between apps)
//
// Renders nothing.

import { useEffect, type JSX } from "react";
import { drainQueue } from "@/lib/db/queue";

export const QueueSyncer = (): JSX.Element | null => {
  useEffect(() => {
    const drain = (): void => {
      void drainQueue();
    };

    drain();

    const onOnline = (): void => drain();
    const onVisibility = (): void => {
      if (document.visibilityState === "visible") drain();
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
};
