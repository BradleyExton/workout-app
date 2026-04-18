"use client";

// Registers the service worker after the (app) layout mounts.
// Production-only — keeping the SW out of dev avoids HMR cache poisoning
// and the "old worker controlling new code" debugging tax.

import { useEffect, type JSX } from "react";

export const SwRegister = (): JSX.Element | null => {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
      return;

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(
      (err) => {
        console.warn("[SwRegister] failed", err);
      },
    );
  }, []);

  return null;
};
