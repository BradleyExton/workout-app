"use client";

import { useState, type JSX } from "react";
import { FinishModal } from "../FinishModal";

type FinishControlsProps = {
  workoutId: string;
  startedAt: string;
  setsCount: number;
  volume: number;
  buttonClassName: string;
  buttonLabel: string;
};

export const FinishControls = ({
  workoutId,
  startedAt,
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
        startedAt={new Date(startedAt)}
        setsCount={setsCount}
        volume={volume}
      />
    </>
  );
};
