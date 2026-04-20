"use client";

import { useState, useTransition, type JSX } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Timer } from "@/components/workout/Timer";
import * as buttonStyles from "@/components/ui/Button/styles";
import { getDb } from "@/lib/db/dexie";
import { drainQueue, enqueue } from "@/lib/db/queue";
import { formatVolume } from "@/lib/format/volume";
import { formatWeight } from "@/lib/format/weight";
import {
  getWorkoutUnlocks,
  type WorkoutUnlocks,
} from "../../actions";
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

const formatPrValue = (
  type: "1rm" | "volume" | "reps",
  value: number,
): string => {
  if (type === "volume") return formatVolume(value);
  if (type === "reps") return `${value} reps`;
  return `${formatWeight(value)} kg`;
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
  const [saving, setSaving] = useState(false);
  const [drainFailed, setDrainFailed] = useState(false);
  const [unlocks, setUnlocks] = useState<WorkoutUnlocks | null>(null);
  const router = useRouter();

  const onFinish = (): void => {
    startTransition(async () => {
      setSaving(true);
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

      // Await the drain so PR + achievement detection runs before we
      // fetch unlocks. If offline, drain reports 0 succeeded and we fall
      // through to redirect without the unlock screen — home will still
      // show the badges once the queue catches up.
      const online = typeof navigator === "undefined" || navigator.onLine;
      if (!online) {
        router.push("/");
        return;
      }

      let drainOk = false;
      try {
        const result = await drainQueue();
        drainOk = result.succeeded > 0 || result.attempted === 0;
      } catch {
        drainOk = false;
      }

      if (!drainOk) {
        setDrainFailed(true);
        setSaving(false);
        return;
      }

      try {
        const result = await getWorkoutUnlocks(workoutId);
        const hasAny =
          result.newPrs.length > 0 || result.newAchievements.length > 0;
        if (!hasAny) {
          router.push("/");
          return;
        }
        setUnlocks(result);
        setSaving(false);
      } catch {
        router.push("/");
      }
    });
  };

  const onContinue = (): void => {
    router.push("/");
  };

  const onDiscard = (): void => {
    startTransition(async () => {
      const db = getDb();
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

  if (unlocks) {
    return (
      <Modal open={open} onClose={onContinue}>
        <div className={styles.header}>
          <div>
            <p className={styles.unlocksKicker}>
              {finishModalCopy.unlocksKicker}
            </p>
            <h3 className={styles.unlocksTitle}>
              {finishModalCopy.unlocksTitle}
            </h3>
          </div>
        </div>
        <div className={styles.unlocksSection}>
          {unlocks.newPrs.map((pr, i) => (
            <div key={`pr-${i}`} className={styles.unlockRow}>
              <span className={styles.unlockTag}>
                {finishModalCopy.newPrLabel}
              </span>
              <span className={styles.unlockBody}>
                {pr.exercise_name} · {finishModalCopy.prTypeLabel[pr.pr_type]}{" "}
                {formatPrValue(pr.pr_type, pr.value)}
              </span>
            </div>
          ))}
          {unlocks.newAchievements.map((a) => (
            <div key={a.slug} className={styles.unlockRow}>
              {a.icon && <span className={styles.unlockIcon}>{a.icon}</span>}
              <span className={styles.unlockTag}>
                {finishModalCopy.unlockedLabel}
              </span>
              <span className={styles.unlockBody}>{a.title}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`${buttonStyles.variant.primary} ${styles.primaryCta}`}
          onClick={onContinue}
        >
          {finishModalCopy.continueCta}
        </button>
      </Modal>
    );
  }

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
          disabled={saving}
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
        onClick={drainFailed ? onContinue : onFinish}
        disabled={saving}
        aria-busy={saving}
        aria-label={saving ? finishModalCopy.savingAria : undefined}
      >
        {saving
          ? finishModalCopy.saving
          : drainFailed
            ? finishModalCopy.continueOffline
            : finishModalCopy.finishAndSave}
      </button>

      {drainFailed && (
        <p role="alert" className={styles.drainErrorRow}>
          {finishModalCopy.drainFailed}
        </p>
      )}

      {!drainFailed && (
        <button
          type="button"
          className={styles.discardBtn}
          onClick={onDiscard}
          disabled={saving}
        >
          {finishModalCopy.discard}
        </button>
      )}
    </Modal>
  );
};
