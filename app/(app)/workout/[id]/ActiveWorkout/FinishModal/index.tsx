"use client";

import { useTransition, type JSX } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Timer } from "@/components/workout/Timer";
import * as buttonStyles from "@/components/ui/Button/styles";
import { getDb } from "@/lib/db/dexie";
import { drainQueue, enqueue } from "@/lib/db/queue";
import { formatVolume } from "@/lib/format/volume";
import { finishModalCopy } from "./copy";
import * as styles from "./styles";

type FinishModalProps = {
  open: boolean;
  onClose: () => void;
  workoutId: string;
  startedAtMs: number;
  setsCount: number;
  volume: number;
};

export const FinishModal = ({
  open,
  onClose,
  workoutId,
  startedAtMs,
  setsCount,
  volume,
}: FinishModalProps): JSX.Element => {
  const [, startTransition] = useTransition();
  const router = useRouter();

  const onFinish = (): void => {
    startTransition(async () => {
      const finishedAt = new Date().toISOString();
      const db = getDb();
      const existing = await db.workouts.get(workoutId);
      if (existing) {
        await db.workouts.update(workoutId, { finished_at: finishedAt });
      }
      await enqueue("finishWorkout", {
        workout_id: workoutId,
        finished_at: finishedAt,
      });
      void drainQueue();
      router.push("/");
    });
  };

  const onDiscard = (): void => {
    startTransition(async () => {
      const db = getDb();
      // Cascade locally: sets -> workout_exercises -> workouts. Dexie
      // doesn't do FK cascades, so we walk them ourselves.
      await db.transaction(
        "rw",
        [db.workouts, db.workout_exercises, db.sets],
        async () => {
          const weIds = await db.workout_exercises
            .where("workout_id")
            .equals(workoutId)
            .primaryKeys();
          if (weIds.length > 0) {
            await db.sets.where("workout_exercise_id").anyOf(weIds).delete();
            await db.workout_exercises
              .where("workout_id")
              .equals(workoutId)
              .delete();
          }
          await db.workouts.delete(workoutId);
        },
      );
      await enqueue("discardWorkout", { workout_id: workoutId });
      void drainQueue();
      router.push("/");
    });
  };

  return (
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
          <Timer since={startedAtMs} className={styles.statValue} />
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

      <button
        type="button"
        className={`${buttonStyles.variant.primary} ${styles.primaryCta}`}
        onClick={onFinish}
      >
        {finishModalCopy.finishAndSave}
      </button>

      <button type="button" className={styles.discardBtn} onClick={onDiscard}>
        {finishModalCopy.discard}
      </button>
    </Modal>
  );
};
