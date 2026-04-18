"use client";

import { useMemo, type JSX } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card } from "@/components/ui/Card";
import { PipRow } from "@/components/ui/PipRow";
import { getDb } from "@/lib/db/dexie";
import { deriveHomeMetrics } from "@/lib/domain/homeMetrics";
import { formatVolume } from "@/lib/format/volume";
import { formatDaysAgo } from "@/lib/format/time";
import type { MuscleGroup } from "@/lib/db/types";
import { homeMetricsCopy } from "./copy";
import * as styles from "./styles";

const PIPS_PER_MUSCLE = 5;
const SINCE_MS = 30 * 86_400_000;

type FlatSet = {
  id: string;
  weight_kg: number;
  reps: number;
  completed_at: string;
  workout_id: string;
  primary_muscle: MuscleGroup;
};

type HomeMetricsProps = {
  serverFlatSets: FlatSet[];
  serverWorkoutStartedAts: string[];
  nowMs: number;
};

export const HomeMetrics = ({
  serverFlatSets,
  serverWorkoutStartedAts,
  nowMs,
}: HomeMetricsProps): JSX.Element => {
  const dexieSets = useLiveQuery(
    () => getDb().sets.toArray(),
    [],
    [],
  );
  const dexieExercises = useLiveQuery(
    () => getDb().workout_exercises.toArray(),
    [],
    [],
  );
  const dexieFinishedWorkouts = useLiveQuery(
    () =>
      getDb()
        .workouts.filter((w) => w.finished_at !== null)
        .toArray(),
    [],
    [],
  );

  const metrics = useMemo(() => {
    const cutoffMs = nowMs - SINCE_MS;
    const weById = new Map(dexieExercises.map((we) => [we.id, we]));

    const setById = new Map<string, FlatSet>();
    for (const s of serverFlatSets) setById.set(s.id, s);

    for (const s of dexieSets) {
      if (new Date(s.completed_at).getTime() < cutoffMs) continue;
      const we = weById.get(s.workout_exercise_id);
      const fromServer = setById.get(s.id);
      const primary_muscle =
        we?.exercise_primary_muscle ?? fromServer?.primary_muscle;
      const workout_id = we?.workout_id ?? fromServer?.workout_id;
      if (!primary_muscle || !workout_id) continue;
      setById.set(s.id, {
        id: s.id,
        weight_kg: s.weight_kg,
        reps: s.reps,
        completed_at: s.completed_at,
        workout_id,
        primary_muscle,
      });
    }

    const startedAts = new Set(serverWorkoutStartedAts);
    for (const w of dexieFinishedWorkouts) {
      if (new Date(w.started_at).getTime() >= nowMs - 60 * 86_400_000) {
        startedAts.add(w.started_at);
      }
    }

    return deriveHomeMetrics(
      [...setById.values()],
      [...startedAts],
      [],
      new Date(nowMs),
    );
  }, [
    serverFlatSets,
    serverWorkoutStartedAts,
    nowMs,
    dexieSets,
    dexieExercises,
    dexieFinishedWorkouts,
  ]);

  return (
    <>
      <Card variant="black" className={styles.coverageHero}>
        <p className={styles.coverageKicker}>{homeMetricsCopy.coverageKicker}</p>
        <div className={styles.coverageNumbersRow}>
          <span className={styles.coverageBigNumber}>
            {metrics.groupsHitThisWeek}
          </span>
          <span className={styles.coverageOfText}>
            {homeMetricsCopy.coverageOf}
          </span>
          <span className={styles.coverageSuffix}>
            {homeMetricsCopy.coverageSuffix}
          </span>
        </div>
        <PipRow
          filled={metrics.groupsHitThisWeek}
          total={6}
          inverse
          className="mt-3"
        />
      </Card>

      <div className={styles.statsRow}>
        <Card variant="lime" size="sm" className={styles.statCard}>
          <p className={styles.statLabel}>{homeMetricsCopy.statWorkouts}</p>
          <p className={styles.statValue}>{metrics.workoutsThisWeek}</p>
        </Card>
        <Card variant="white" size="sm" className={styles.statCard}>
          <p className={styles.statLabel}>{homeMetricsCopy.statVolume}</p>
          <p className={styles.statValue}>
            {formatVolume(metrics.volumeThisWeek)}
          </p>
        </Card>
        <Card variant="black" size="sm" className={styles.statCard}>
          <p className={styles.statLabel}>{homeMetricsCopy.statStreak}</p>
          <p className={styles.statValue}>{metrics.streakDays}d</p>
        </Card>
      </div>

      <h2 className={styles.musclesHeader}>{homeMetricsCopy.musclesHeader}</h2>
      <div className={styles.muscleGrid}>
        {metrics.coverage.map((entry) => (
          <Card
            key={entry.group}
            size="sm"
            variant={entry.setsThisWeek === 0 ? "cream" : "white"}
            className={styles.muscleCard}
          >
            <p className={styles.muscleName}>{entry.group.toUpperCase()}</p>
            <PipRow
              filled={Math.min(entry.setsThisWeek, PIPS_PER_MUSCLE)}
              total={PIPS_PER_MUSCLE}
              size="sm"
              className="mt-1"
            />
            <p className={styles.muscleDaysRow}>
              {entry.overdue && <span className={styles.muscleDot} />}
              {formatDaysAgo(entry.lastHitDaysAgo)}
            </p>
          </Card>
        ))}
      </div>
    </>
  );
};
