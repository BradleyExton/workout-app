"use client";

import { type JSX } from "react";
import { useNowMs } from "@/lib/hooks/useSessionClock";
import { formatElapsed } from "@/lib/format/time";

type TimerProps = {
  // ms-epoch, not a Date: keeps the useEffect dep stable across re-renders.
  since: number;
  // ms-epoch the clock stopped at. Non-null freezes the display there — a
  // session with no logged set for long enough isn't running, and a number
  // that keeps climbing overnight is the bug this exists to fix. Callers
  // derive it with `useSessionClock`; null means keep counting.
  stoppedAt?: number | null;
  className?: string;
};

export const Timer = ({
  since,
  stoppedAt = null,
  className = "",
}: TimerProps): JSX.Element => {
  // The tick keeps running while stopped so the display picks straight
  // back up — from the true elapsed time, not from where it froze — the
  // moment the next logged set moves `stoppedAt` back to null.
  const nowMs = useNowMs();
  const elapsed = (stoppedAt ?? nowMs) - since;

  // SSR renders Date.now() at server time; client hydrates seconds later
  // and recomputes — the mismatch is expected and resolves on first tick.
  return (
    <span className={className} suppressHydrationWarning>
      {formatElapsed(elapsed)}
    </span>
  );
};
