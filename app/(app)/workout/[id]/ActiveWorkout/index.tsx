import type { JSX } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Timer } from "@/components/workout/Timer";
import * as buttonStyles from "@/components/ui/Button/styles";
import type { MuscleGroup } from "@/lib/db/types";
import { formatWeight } from "@/lib/format/weight";
import { formatVolume } from "@/lib/format/volume";
import { relativeDays } from "@/lib/format/time";
import { CurrentSetForm } from "./CurrentSetForm";
import { FinishControls } from "./FinishControls";
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
  lastSession: { finishedAt: string; sets: LastSessionSet[] } | null;
  todayItems: TodayItem[];
  stats: { sets: number; exercises: number; volume: number };
};

export const ActiveWorkout = ({
  workout,
  current,
  currentSets,
  lastSession,
  todayItems,
  stats,
}: ActiveWorkoutProps): JSX.Element => {
  const startedAtMs = new Date(workout.started_at).getTime();
  const nextSetNumber = (currentSets.at(-1)?.set_number ?? 0) + 1;

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
        <div className={styles.timerPill}>
          <span className={styles.timerDot} />
          <Timer since={startedAtMs} className={styles.timerText} />
        </div>
        <FinishControls
          workoutId={workout.id}
          startedAtMs={startedAtMs}
          setsCount={stats.sets}
          volume={stats.volume}
          buttonClassName={styles.finishBtn}
          buttonLabel={activeWorkoutCopy.finish}
        />
      </div>

      {current?.exercise ? (
        <>
          <Card variant="lime" className={styles.hero}>
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

          {lastSession && lastSession.sets.length > 0 && (
            <Card variant="cream" className={styles.lastSessionCard}>
              <div className={styles.lastSessionHeader}>
                <p className={styles.lastSessionLabel}>
                  {activeWorkoutCopy.lastSessionPrefix}{" "}
                  {relativeDays(lastSession.finishedAt)}
                </p>
              </div>
              <div className={styles.lastSessionPills}>
                {lastSession.sets.map((set) => (
                  <span key={set.set_number} className={styles.lastSessionPill}>
                    {formatWeight(set.weight_kg)}×{set.reps}
                  </span>
                ))}
              </div>
            </Card>
          )}

          <div className={styles.setList}>
            {currentSets.map((set) => (
              <Card key={set.id} size="sm" className={styles.setRow}>
                <span className={styles.setRowNumber}>{set.set_number}</span>
                <span className={styles.setRowValue}>
                  {formatWeight(set.weight_kg)} × {set.reps}
                </span>
                <span className={styles.setRowCheck}>
                  {activeWorkoutCopy.setRowCheck}
                </span>
              </Card>
            ))}

            <CurrentSetForm
              workoutExerciseId={current.id}
              setNumber={nextSetNumber}
              defaults={defaults}
              formId={CURRENT_SET_FORM_ID}
            />
          </div>

          <Card variant="cream" size="sm" className={styles.statsCard}>
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
                    <Card key={item.id} size="sm" className={styles.todayRow}>
                      <span className={styles.todayName}>{item.name}</span>
                      <span className={styles.todayStats}>
                        {item.setCount} ×{" "}
                        {item.lastWeight !== null
                          ? formatWeight(item.lastWeight)
                          : "—"}
                      </span>
                    </Card>
                  ))}
                </div>
              </>
            )}
            <Link className={styles.addExerciseBtn} href="/workout/new">
              {activeWorkoutCopy.addExercise}
            </Link>
          </div>

          <div className={styles.ctaZone}>
            <button
              type="submit"
              form={CURRENT_SET_FORM_ID}
              className={`${styles.ctaInner} ${buttonStyles.variant.primary}`}
            >
              {activeWorkoutCopy.logSet}
            </button>
          </div>
        </>
      ) : (
        <p className={styles.empty}>{activeWorkoutCopy.emptyHint}</p>
      )}
    </main>
  );
};
