"use client";

import { useEffect, useState } from "react";

// Tracks the browser's online status with SSR-safe defaults. navigator.onLine
// has well-known caveats (a captive portal is "online" to the browser), but
// for our purposes — "the gym wifi just dropped mid-set" — it's a good
// enough signal to trigger a queue drain when it flips back to true.
export const useOnlineStatus = (): boolean => {
  // Optimistic default: assume online until told otherwise. Server render
  // always returns true so the markup matches the first client render when
  // the user actually is online (the common case).
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = (): void => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
};
