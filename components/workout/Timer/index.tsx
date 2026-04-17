"use client";

import { useEffect, useState, type JSX } from "react";
import { formatElapsed } from "@/lib/format/time";

type TimerProps = {
  // ms-epoch, not a Date: keeps the useEffect dep stable across re-renders.
  since: number;
  className?: string;
};

export const Timer = ({ since, className = "" }: TimerProps): JSX.Element => {
  const [elapsed, setElapsed] = useState(() => Date.now() - since);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - since), 1000);
    return () => clearInterval(id);
  }, [since]);

  return <span className={className}>{formatElapsed(elapsed)}</span>;
};
