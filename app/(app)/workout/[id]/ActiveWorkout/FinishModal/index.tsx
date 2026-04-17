"use client";

import type { JSX } from "react";
import { Modal } from "@/components/ui/Modal";
import { Timer } from "@/components/workout/Timer";
import * as buttonStyles from "@/components/ui/Button/styles";
import { discardWorkout, finishWorkout } from "../../actions";
import { finishModalCopy } from "./copy";
import * as styles from "./styles";

type FinishModalProps = {
  open: boolean;
  onClose: () => void;
  workoutId: string;
  startedAt: Date;
  setsCount: number;
  volume: number;
};

const formatVolume = (volume: number): string => {
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k`;
  return Math.round(volume).toString();
};

export const FinishModal = ({
  open,
  onClose,
  workoutId,
  startedAt,
  setsCount,
  volume,
}: FinishModalProps): JSX.Element => (
  <Modal open={open} onClose={onClose}>
    <div className={styles.header}>
      <div>
        <p className={styles.kicker}>{finishModalCopy.kicker}</p>
        <h3 className={styles.title}>{finishModalCopy.title}</h3>
      </div>
      <button
        type="button"
        aria-label={finishModalCopy.closeLabel}
        className={styles.closeBtn}
        onClick={onClose}
      >
        ×
      </button>
    </div>

    <div className={styles.statsStrip}>
      <div className={styles.statCol}>
        <span className={styles.statLabel}>{finishModalCopy.statTime}</span>
        <Timer since={startedAt} className={styles.statValue} />
      </div>
      <div className={styles.divider} />
      <div className={styles.statCol}>
        <span className={styles.statLabel}>{finishModalCopy.statSets}</span>
        <span className={styles.statValue}>{setsCount}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.statCol}>
        <span className={styles.statLabel}>{finishModalCopy.statVolume}</span>
        <span className={styles.statValue}>{formatVolume(volume)}</span>
      </div>
    </div>

    <form action={finishWorkout} className={styles.primaryCta}>
      <input type="hidden" name="workoutId" value={workoutId} />
      <button type="submit" className={buttonStyles.variant.primary}>
        {finishModalCopy.finishAndSave}
      </button>
    </form>

    <form action={discardWorkout}>
      <input type="hidden" name="workoutId" value={workoutId} />
      <button type="submit" className={styles.discardBtn}>
        {finishModalCopy.discard}
      </button>
    </form>
  </Modal>
);
