"use client";

import { useState, useTransition, type JSX } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Timer } from "@/components/workout/Timer";
import * as buttonStyles from "@/components/ui/Button/styles";
import {
  discardWorkoutLocally,
  finishWorkoutLocally,
} from "@/lib/db/closeWorkout";
import { drainQueue } from "@/lib/db/queue";
import { recordedFinishAtMs, toMinutes, trimmedIdleMs } from "@/lib/domain/idle";
import { useSessionClock } from "@/lib/hooks/useSessionClock";
import { formatVolume } from "@/lib/format/volume";
import {
  getWorkoutUnlocks,
  type WorkoutUnlocks,
} from "../../actions";
import type { FinishFlow } from "../FinishControls";
import { finishModalCopy } from "./copy";
import * as styles from "./styles";

type FinishModalProps = {
  open: boolean;
  onClose: () => void;
  workoutId: string;
  startedAtMs: number;
  lastSetAtMs: number | null;
  setsCount: number;
  volume: number;
  finishFlow: FinishFlow;
};

const EMPTY_UNLOCKS: WorkoutUnlocks = { newPrs: [], newAchievements: [] };

export const FinishModal = ({
  open,
  onClose,
  workoutId,
  startedAtMs,
  lastSetAtMs,
  setsCount,
  volume,
  finishFlow,
}: FinishModalProps): JSX.Element => {
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [drainFailed, setDrainFailed] = useState(false);
  const router = useRouter();

  const isEmpty = setsCount === 0;
  const busy = saving || discarding;

  // The number in the stats strip is the number that gets written, not
  // wall-clock time: someone who taps Finish the morning after should see
  // the honest duration before they commit to it, not a five-hour figure
  // that quietly becomes a five-hour row in history.
  const activity = { startedAtMs, lastSetAtMs, ackAtMs: null };
  const clock = useSessionClock(activity);
  const trimmedMin = toMinutes(trimmedIdleMs(activity, clock.nowMs));

  // Re-opening the modal always starts from the non-confirming state
  // (state adjustment during render, per React docs, not an effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setConfirmingDiscard(false);
  }

  const onFinish = (): void => {
    // Outside the transition: once the Dexie write lands, the Hydrator
    // must already know this finish is ours, or it redirects home.
    // Inside startTransition this update is deferred and loses that race.
    finishFlow.onStart();
    startTransition(async () => {
      setSaving(true);
      // Recompute at tap time rather than reusing the rendered clock —
      // the modal may have sat open for a while.
      const finishedAtMs = recordedFinishAtMs(activity, Date.now());
      const finishedAt = new Date(finishedAtMs).toISOString();
      const durationMs = finishedAtMs - startedAtMs;
      await finishWorkoutLocally(workoutId, finishedAt);

      // Await the drain so PR + achievement detection runs before we
      // fetch unlocks. If offline, the complete screen still celebrates
      // with local stats — home will show the badges once the queue
      // catches up.
      const online = typeof navigator === "undefined" || navigator.onLine;
      if (!online) {
        finishFlow.onComplete({ unlocks: EMPTY_UNLOCKS, durationMs });
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

      let unlocks = EMPTY_UNLOCKS;
      try {
        unlocks = await getWorkoutUnlocks(workoutId);
      } catch {
        // Best-effort — celebrate without badges rather than skip the screen.
      }
      finishFlow.onComplete({ unlocks, durationMs });
    });
  };

  const onContinue = (): void => {
    router.push("/");
  };

  const onDiscard = (): void => {
    setDiscarding(true);
    startTransition(async () => {
      await discardWorkoutLocally(workoutId);
      void drainQueue();
      router.push("/");
    });
  };

  return (
    <Modal open={open} onClose={onClose} locked={busy}>
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
          disabled={busy}
        >
          ×
        </button>
      </div>

      <div className={styles.statsStrip}>
        <div className={styles.statCol}>
          <span className={styles.statLabel}>{finishModalCopy.statTime}</span>
          <Timer
            since={startedAtMs}
            stoppedAt={clock.stoppedAt}
            className={styles.statValue}
          />
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

      {clock.paused && trimmedMin > 0 && !isEmpty && (
        <p className={styles.trimNote}>
          {finishModalCopy.trimmedNote(trimmedMin)}
        </p>
      )}

      {isEmpty ? (
        // Nothing was logged: discarding is the safe default, and it
        // needs no confirmation because there's nothing to lose.
        <>
          <button
            type="button"
            className={`${buttonStyles.variant.primary} ${styles.primaryCta}`}
            onClick={onDiscard}
            disabled={busy}
            aria-busy={discarding}
          >
            {discarding
              ? finishModalCopy.discarding
              : finishModalCopy.discardEmpty}
          </button>
          <button
            type="button"
            className={styles.discardBtn}
            onClick={drainFailed ? onContinue : onFinish}
            disabled={busy}
          >
            {saving
              ? finishModalCopy.saving
              : drainFailed
                ? finishModalCopy.continueOffline
                : finishModalCopy.saveEmpty}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className={`${buttonStyles.variant.primary} ${styles.primaryCta}`}
            onClick={drainFailed ? onContinue : onFinish}
            disabled={busy}
            aria-busy={saving}
            aria-label={saving ? finishModalCopy.savingAria : undefined}
          >
            {saving
              ? finishModalCopy.saving
              : drainFailed
                ? finishModalCopy.continueOffline
                : finishModalCopy.finishAndSave}
          </button>

          {!drainFailed &&
            (confirmingDiscard ? (
              <div className={styles.discardConfirmBlock}>
                <p className={styles.discardConfirmText}>
                  {finishModalCopy.discardConfirmBody(setsCount)}
                </p>
                <button
                  type="button"
                  className={styles.discardConfirmBtn}
                  onClick={onDiscard}
                  disabled={busy}
                  aria-busy={discarding}
                >
                  {discarding
                    ? finishModalCopy.discarding
                    : finishModalCopy.discardConfirmCta}
                </button>
                <button
                  type="button"
                  className={styles.discardBtn}
                  onClick={() => setConfirmingDiscard(false)}
                  disabled={busy}
                >
                  {finishModalCopy.discardCancel}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.discardBtn}
                onClick={() => setConfirmingDiscard(true)}
                disabled={busy}
              >
                {finishModalCopy.discard}
              </button>
            ))}
        </>
      )}

      {drainFailed && (
        <p role="alert" className={styles.drainErrorRow}>
          {finishModalCopy.drainFailed}
        </p>
      )}
    </Modal>
  );
};
