"use client";

import { useState, type JSX } from "react";
import { FinishModal } from "../FinishModal";

type FinishControlsProps = {
  workoutId: string;
  startedAtMs: number;
  setsCount: number;
  volume: number;
  buttonClassName: string;
  buttonLabel: string;
};

export const FinishControls = ({
  workoutId,
  startedAtMs,
  setsCount,
  volume,
  buttonClassName,
  buttonLabel,
}: FinishControlsProps): JSX.Element => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </button>
      <FinishModal
        open={open}
        onClose={() => setOpen(false)}
        workoutId={workoutId}
        startedAtMs={startedAtMs}
        setsCount={setsCount}
        volume={volume}
      />
    </>
  );
};
