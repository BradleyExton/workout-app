"use client";

import { useState, type JSX } from "react";
import type { WorkoutUnlocks } from "../../actions";
import { FinishModal } from "../FinishModal";

// The finish lifecycle lives in the Hydrator: `onStart` suppresses its
// finished-workout redirect before Dexie learns about finished_at, and
// `onComplete` swaps the page for the celebration screen.
export type FinishFlow = {
  onStart: () => void;
  onReset: () => void;
  onComplete: (result: {
    unlocks: WorkoutUnlocks;
    durationMs: number;
  }) => void;
};

type FinishControlsProps = {
  workoutId: string;
  startedAtMs: number;
  setsCount: number;
  volume: number;
  finishFlow: FinishFlow;
  buttonClassName: string;
  buttonLabel: string;
};

export const FinishControls = ({
  workoutId,
  startedAtMs,
  setsCount,
  volume,
  finishFlow,
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
        onClose={() => {
          setOpen(false);
          finishFlow.onReset();
        }}
        workoutId={workoutId}
        startedAtMs={startedAtMs}
        setsCount={setsCount}
        volume={volume}
        finishFlow={finishFlow}
      />
    </>
  );
};
