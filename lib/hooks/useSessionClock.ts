"use client";

import { useEffect, useState } from "react";
import {
  idlePhase,
  timerStopAtMs,
  type IdlePhase,
  type SessionActivity,
} from "@/lib/domain/idle";

const TICK_MS = 1000;

// A ticking `Date.now()`.
//
// The visibilitychange listener is the load-bearing part on mobile:
// backgrounded tabs get their timers throttled or frozen outright, so a
// PWA relaunched after a night asleep would otherwise re-evaluate its
// idle state on whatever stale value the interval last managed to write.
// Coming back to the foreground reads the real clock immediately.
export const useNowMs = (tickMs: number = TICK_MS): number => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const tick = (): void => setNowMs(Date.now());
    const id = setInterval(tick, tickMs);
    const onVisibility = (): void => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", tick);
    };
  }, [tickMs]);

  return nowMs;
};

export type SessionClock = {
  nowMs: number;
  // ms-epoch the clock froze at, or null while it's still counting.
  stoppedAt: number | null;
  paused: boolean;
  phase: IdlePhase;
};

// Ties a session's activity to a live clock. `activity` may be null while
// Dexie is still answering — the clock keeps ticking, nothing is paused.
export const useSessionClock = (
  activity: SessionActivity | null,
  tickMs: number = TICK_MS,
): SessionClock => {
  const nowMs = useNowMs(tickMs);
  if (!activity) {
    return { nowMs, stoppedAt: null, paused: false, phase: "live" };
  }
  const stoppedAt = timerStopAtMs(activity, nowMs);
  return {
    nowMs,
    stoppedAt,
    paused: stoppedAt !== null,
    phase: idlePhase(activity, nowMs),
  };
};
