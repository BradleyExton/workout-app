"use client";

import { useEffect, useState, type JSX } from "react";

type TimerProps = {
  since: Date;
  className?: string;
};

const formatElapsed = (ms: number): string => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const Timer = ({ since, className = "" }: TimerProps): JSX.Element => {
  const [elapsed, setElapsed] = useState(() => Date.now() - since.getTime());

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - since.getTime()), 1000);
    return () => clearInterval(id);
  }, [since]);

  return <span className={className}>{formatElapsed(elapsed)}</span>;
};
