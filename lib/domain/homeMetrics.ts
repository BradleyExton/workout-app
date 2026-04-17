import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/db/types";

type SetRecord = {
  weight_kg: number;
  reps: number;
  completed_at: string;
  workout_id: string;
  primary_muscle: MuscleGroup;
};

export type MuscleCoverage = {
  group: MuscleGroup;
  setsThisWeek: number;
  lastHitDaysAgo: number | null;
  overdue: boolean;
};

export type HomeMetrics = {
  coverage: MuscleCoverage[];
  groupsHitThisWeek: number;
  workoutsThisWeek: number;
  volumeThisWeek: number;
  streakDays: number;
};

const MS_PER_DAY = 86_400_000;
const OVERDUE_THRESHOLD_DAYS = 7;
const WEEK_DAYS = 7;

const dayKey = (iso: string | Date): string => {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toISOString().slice(0, 10);
};

export const deriveHomeMetrics = (
  sets: SetRecord[],
  workoutStartedAts: string[],
  now: Date = new Date(),
): HomeMetrics => {
  const weekAgoMs = now.getTime() - WEEK_DAYS * MS_PER_DAY;

  const setsPerGroup = new Map<MuscleGroup, number>();
  const lastHitPerGroup = new Map<MuscleGroup, Date>();
  const weekWorkoutIds = new Set<string>();
  let volumeThisWeek = 0;

  for (const set of sets) {
    const completed = new Date(set.completed_at);
    const inWeek = completed.getTime() >= weekAgoMs;

    if (inWeek) {
      setsPerGroup.set(
        set.primary_muscle,
        (setsPerGroup.get(set.primary_muscle) ?? 0) + 1,
      );
      weekWorkoutIds.add(set.workout_id);
      volumeThisWeek += set.weight_kg * set.reps;
    }

    const prev = lastHitPerGroup.get(set.primary_muscle);
    if (!prev || completed > prev) lastHitPerGroup.set(set.primary_muscle, completed);
  }

  const coverage: MuscleCoverage[] = MUSCLE_GROUPS.map((group) => {
    const last = lastHitPerGroup.get(group);
    const daysAgo = last
      ? Math.floor((now.getTime() - last.getTime()) / MS_PER_DAY)
      : null;
    return {
      group,
      setsThisWeek: setsPerGroup.get(group) ?? 0,
      lastHitDaysAgo: daysAgo,
      overdue: daysAgo === null ? false : daysAgo > OVERDUE_THRESHOLD_DAYS,
    };
  });

  const groupsHitThisWeek = coverage.filter((c) => c.setsThisWeek > 0).length;

  const workoutDays = new Set(workoutStartedAts.map(dayKey));
  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(new Date(now.getTime() - MS_PER_DAY));

  let streakDays = 0;
  let cursor =
    workoutDays.has(todayKey)
      ? new Date(now)
      : workoutDays.has(yesterdayKey)
        ? new Date(now.getTime() - MS_PER_DAY)
        : null;

  while (cursor && workoutDays.has(dayKey(cursor))) {
    streakDays++;
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }

  return {
    coverage,
    groupsHitThisWeek,
    workoutsThisWeek: weekWorkoutIds.size,
    volumeThisWeek,
    streakDays,
  };
};
