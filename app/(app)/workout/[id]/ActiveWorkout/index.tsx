"use client";

import type { JSX } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Timer } from "@/components/workout/Timer";
import * as buttonStyles from "@/components/ui/Button/styles";
import { CtaZone } from "@/components/ui/CtaZone";
import * as ctaStyles from "@/components/ui/CtaZone/styles";
import { useSessionClock } from "@/lib/hooks/useSessionClock";
import type { MuscleGroup } from "@/lib/db/types";
import { formatWeight } from "@/lib/format/weight";
import { formatVolume } from "@/lib/format/volume";
import { relativeDays } from "@/lib/format/time";
import { CurrentSetForm } from "./CurrentSetForm";
import { FinishControls, type FinishFlow } from "./FinishControls";
import { SetList } from "./SetList";
import { activeWorkoutCopy } from "./copy";
import * as styles from "./styles";

const CURRENT_SET_FORM_ID = "current-set-form";

type ExerciseLite = {
  id: string;
  name: string;
  primary_muscle: MuscleGroup;
};

type WorkoutExercise = {
  id: string;
  position: number;
  exercise: ExerciseLite | null;
};

type SetRow = {
  id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  pending: boolean;
};

type SetPrFlags = { oneRm: boolean; volume: boolean; reps: boolean };

type ExercisePrs = {
  oneRm: number | null;
  volume: number | null;
  reps: number | null;
};

type LastSessionSet = {
  set_number: number;
  weight_kg: number;
  reps: number;
};

type TodayItem = {
  id: string;
  name: string;
  setCount: number;
  lastWeight: number | null;
};

type ActiveWorkoutProps = {
  workout: {
    id: string;
    started_at: string;
    finished_at: string | null;
  };
  current: WorkoutExercise | null;
  currentSets: SetRow[];
  // Newest set across the whole session (not just the current exercise),
  // ms-epoch. null when nothing has been logged yet.
  lastSetAtMs: number | null;
  lastSession: { finishedAt: string; sets: LastSessionSet[] } | null;
  prs: ExercisePrs;
  setPrFlags: Record<string, SetPrFlags>;
  todayItems: TodayItem[];
  stats: { sets: number; exercises: number; volume: number };
  finishFlow: FinishFlow;
  onSelectExercise: (weId: string) => void;
};

export const ActiveWorkout = ({
  workout,
  current,
  currentSets,
  lastSetAtMs,
  lastSession,
  prs,
  setPrFlags,
  todayItems,
  stats,
  finishFlow,
  onSelectExercise,
}: ActiveWorkoutProps): JSX.Element => {
  const addExerciseHref = `/workout/new?from=${workout.id}`;
  const startedAtMs = new Date(workout.started_at).getTime();
  const nextSetNumber = (currentSets.at(-1)?.set_number ?? 0) + 1;

  // The pill is the session's honesty indicator: pulse + a live number
  // while sets are landing, greyed and labelled the moment the clock
  // stops meaning anything. `ackAtMs` is null here on purpose — an "I'm
  // still going" tap buys the session time (IdleGuard's job) but must not
  // restart a clock that measures training.
  const clock = useSessionClock({ startedAtMs, lastSetAtMs, ackAtMs: null });

  // Last session's set count is the only target we have until the XP
  // economy lands. TODO(xp): replace with workout-level quest progress.
  const targetSets =
    lastSession && lastSession.sets.length > 0 ? lastSession.sets.length : null;
  const progressPct = targetSets
    ? Math.min(100, Math.round((currentSets.length / targetSets) * 100))
    : null;

  const lastInWorkout = currentSets.at(-1);
  const lastInPrev = lastSession?.sets.at(-1);
  const defaults = {
    weight_kg: lastInWorkout
      ? formatWeight(lastInWorkout.weight_kg)
      : lastInPrev
        ? formatWeight(lastInPrev.weight_kg)
        : "",
    reps: lastInWorkout
      ? String(lastInWorkout.reps)
      : lastInPrev
        ? String(lastInPrev.reps)
        : "",
  };

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <Link className={styles.back} href="/">
          {activeWorkoutCopy.back}
        </Link>
        <div className={clock.paused ? styles.timerPillPaused : styles.timerPill}>
          <span className={clock.paused ? styles.timerDotPaused : styles.timerDot} />
          <Timer
            since={startedAtMs}
            stoppedAt={clock.stoppedAt}
            className={styles.timerText}
          />
          {clock.paused && (
            <span className={styles.timerPausedLabel}>
              {activeWorkoutCopy.timerPaused}
            </span>
          )}
        </div>
        <FinishControls
          workoutId={workout.id}
          startedAtMs={startedAtMs}
          lastSetAtMs={lastSetAtMs}
          setsCount={stats.sets}
          volume={stats.volume}
          finishFlow={finishFlow}
          buttonClassName={styles.finishBtn}
          buttonLabel={activeWorkoutCopy.finish}
        />
      </div>

      {current?.exercise ? (
        <>
          <Card variant="plasma" className={styles.hero}>
            <div className={styles.heroRow}>
              <span className={styles.groupBadge}>
                {current.exercise.primary_muscle}
              </span>
              <span className={styles.setLabel}>
                {activeWorkoutCopy.currentSetLabel(nextSetNumber)}
              </span>
            </div>
            <h2 className={styles.exerciseName}>{current.exercise.name}</h2>
          </Card>

          {progressPct !== null && targetSets !== null && (
            <div className={styles.progressBlock}>
              <div className={styles.progressLabelRow}>
                <span>{activeWorkoutCopy.progressLabel}</span>
                <span>
                  {activeWorkoutCopy.progressValue(
                    currentSets.length,
                    targetSets,
                  )}
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {(lastSession && lastSession.sets.length > 0) ||
          prs.oneRm !== null ||
          prs.volume !== null ||
          prs.reps !== null ? (
            <Card variant="muted" className={styles.lastSessionCard}>
              {lastSession && lastSession.sets.length > 0 && (
                <>
                  <div className={styles.lastSessionHeader}>
                    <p className={styles.lastSessionLabel}>
                      {activeWorkoutCopy.lastSessionPrefix}{" "}
                      {relativeDays(lastSession.finishedAt)}
                    </p>
                  </div>
                  <div className={styles.lastSessionPills}>
                    {lastSession.sets.map((set) => (
                      <span
                        key={set.set_number}
                        className={styles.lastSessionPill}
                      >
                        {formatWeight(set.weight_kg)}×{set.reps}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {(prs.oneRm !== null ||
                prs.volume !== null ||
                prs.reps !== null) && (
                <div
                  className={
                    lastSession && lastSession.sets.length > 0
                      ? styles.prRow
                      : ""
                  }
                >
                  <p className={styles.prLabel}>{activeWorkoutCopy.prLabel}</p>
                  <div className={styles.prPills}>
                    {prs.oneRm !== null && (
                      <span className={styles.prPill}>
                        <span className={styles.prPillKey}>
                          {activeWorkoutCopy.pr1rm}
                        </span>
                        <span className={styles.prPillValue}>
                          {formatWeight(prs.oneRm)}
                        </span>
                      </span>
                    )}
                    {prs.volume !== null && (
                      <span className={styles.prPill}>
                        <span className={styles.prPillKey}>
                          {activeWorkoutCopy.prVolume}
                        </span>
                        <span className={styles.prPillValue}>
                          {formatVolume(prs.volume)}
                        </span>
                      </span>
                    )}
                    {prs.reps !== null && (
                      <span className={styles.prPill}>
                        <span className={styles.prPillKey}>
                          {activeWorkoutCopy.prReps}
                        </span>
                        <span className={styles.prPillValue}>{prs.reps}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ) : null}

          <div className={styles.setList}>
            <SetList sets={currentSets} prFlags={setPrFlags} />

            <CurrentSetForm
              // Remount when the exercise changes AND when last-session
              // data arrives — the prefill defaults are captured at mount.
              key={`${current.id}:${lastSession ? "prev" : "fresh"}`}
              workoutExerciseId={current.id}
              initialSetNumber={nextSetNumber}
              defaults={defaults}
              formId={CURRENT_SET_FORM_ID}
            />
          </div>

          <Card variant="muted" size="sm" className={styles.statsCard}>
            <p className={styles.statsLabel}>{activeWorkoutCopy.sessionLabel}</p>
            <div className={styles.statsGrid}>
              <div>
                <p className={styles.statValue}>{formatVolume(stats.volume)}</p>
                <p className={styles.statKey}>{activeWorkoutCopy.statVolume}</p>
              </div>
              <div>
                <p className={styles.statValue}>{stats.sets}</p>
                <p className={styles.statKey}>{activeWorkoutCopy.statSets}</p>
              </div>
              <div>
                <p className={styles.statValue}>{stats.exercises}</p>
                <p className={styles.statKey}>{activeWorkoutCopy.statExercises}</p>
              </div>
            </div>
          </Card>

          <div className={styles.todaySection}>
            {todayItems.length > 0 && (
              <>
                <p className={styles.todayLabel}>{activeWorkoutCopy.todayLabel}</p>
                <div className={styles.todayList}>
                  {todayItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={styles.todayRow}
                      onClick={() => onSelectExercise(item.id)}
                      aria-label={activeWorkoutCopy.todayRowLabel(item.name)}
                    >
                      <span className={styles.todayName}>{item.name}</span>
                      <span className={styles.todayStats}>
                        {activeWorkoutCopy.todaySetCount(item.setCount)}
                        {item.lastWeight !== null
                          ? ` · ${formatWeight(item.lastWeight)} kg`
                          : ""}
                      </span>
                      <span className={styles.todayChevron} aria-hidden>
                        ›
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <Link className={styles.addExerciseBtn} href={addExerciseHref}>
              {activeWorkoutCopy.addExercise}
            </Link>
          </div>

          <CtaZone>
            <button
              type="submit"
              form={CURRENT_SET_FORM_ID}
              className={`${ctaStyles.inner} ${buttonStyles.variant.pulse}`}
            >
              {activeWorkoutCopy.logSet}
            </button>
          </CtaZone>
        </>
      ) : (
        <div className={styles.emptyBlock}>
          <p className={styles.empty}>{activeWorkoutCopy.emptyHint}</p>
          <Link className={styles.addExerciseBtn} href={addExerciseHref}>
            {activeWorkoutCopy.addExercise}
          </Link>
        </div>
      )}
    </main>
  );
};
