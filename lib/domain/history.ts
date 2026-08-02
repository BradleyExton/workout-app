// Assembles the history feed from the server snapshot plus the Dexie
// mirror.
//
// Same merge shape as the active-workout Hydrator: server rows seed the
// maps, Dexie rows win on conflict (they are what this device wrote most
// recently), and deleteSet tombstones stop a stale server snapshot from
// resurrecting sets the user removed. That makes the whole feed — rows
// AND their expanded detail — readable offline, because everything the
// detail needs is either in the snapshot the page shipped with or in
// IndexedDB.

import type {
  CardioSessionRow,
  SetLocalRow,
  WorkoutExerciseRow,
  WorkoutRow,
} from "@/lib/db/dexie";
import type { CardioModality, MuscleGroup } from "@/lib/db/types";
import { IMPLAUSIBLE_DURATION_MS } from "@/lib/domain/idle";

export type HistorySetItem = {
  id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
};

export type HistoryExerciseItem = {
  id: string;
  position: number;
  // null when a Dexie-only row predates the denormalized exercise columns.
  name: string | null;
  primary_muscle: MuscleGroup | null;
  sets: HistorySetItem[];
};

export type LiftItem = {
  kind: "lift";
  id: string;
  at: string;
  finished_at: string | null;
  exercises: HistoryExerciseItem[];
};

export type CardioItem = {
  kind: "cardio";
  id: string;
  at: string;
  modality: CardioModality;
  duration_sec: number;
  distance_m: number | null;
};

export type HistoryItem = LiftItem | CardioItem;

export type HistorySnapshot = {
  workouts: { id: string; started_at: string; finished_at: string | null }[];
  exercises: {
    id: string;
    workout_id: string;
    position: number;
    name: string | null;
    primary_muscle: MuscleGroup | null;
  }[];
  sets: {
    id: string;
    workout_exercise_id: string;
    set_number: number;
    weight_kg: number;
    reps: number;
  }[];
  cardio: {
    id: string;
    started_at: string;
    modality: CardioModality;
    duration_sec: number;
    distance_m: number | null;
  }[];
};

export type HistoryOverlay = {
  workouts: WorkoutRow[];
  exercises: WorkoutExerciseRow[];
  sets: SetLocalRow[];
  cardio: CardioSessionRow[];
  deletedSetIds: ReadonlySet<string>;
};

type WorkoutEntry = { id: string; started_at: string; finished_at: string | null };
type ExerciseEntry = HistoryExerciseItem & { workout_id: string };

export const buildHistoryItems = (
  snapshot: HistorySnapshot,
  overlay: HistoryOverlay,
  sinceMs: number,
): HistoryItem[] => {
  // 1. Finished workouts only — an in-progress one belongs to the resume
  //    CTA, not to history.
  const workouts = new Map<string, WorkoutEntry>();
  for (const workout of snapshot.workouts) workouts.set(workout.id, workout);
  for (const workout of overlay.workouts) {
    if (workout.finished_at === null) continue;
    if (new Date(workout.started_at).getTime() < sinceMs) continue;
    workouts.set(workout.id, {
      id: workout.id,
      started_at: workout.started_at,
      finished_at: workout.finished_at,
    });
  }

  // 2. Exercises. Dexie denormalizes name/muscle but the columns are
  //    optional, so keep whatever the server already told us.
  const exercises = new Map<string, ExerciseEntry>();
  for (const exercise of snapshot.exercises) {
    exercises.set(exercise.id, { ...exercise, sets: [] });
  }
  for (const exercise of overlay.exercises) {
    const known = exercises.get(exercise.id);
    exercises.set(exercise.id, {
      id: exercise.id,
      workout_id: exercise.workout_id,
      position: exercise.position,
      name: exercise.exercise_name ?? known?.name ?? null,
      primary_muscle:
        exercise.exercise_primary_muscle ?? known?.primary_muscle ?? null,
      sets: [],
    });
  }

  // 3. Sets, hung off their exercise.
  const sets = new Map<string, SetLocalRow | HistorySnapshot["sets"][number]>();
  for (const set of snapshot.sets) sets.set(set.id, set);
  for (const set of overlay.sets) sets.set(set.id, set);

  for (const set of sets.values()) {
    if (overlay.deletedSetIds.has(set.id)) continue;
    const exercise = exercises.get(set.workout_exercise_id);
    if (!exercise) continue;
    exercise.sets.push({
      id: set.id,
      set_number: set.set_number,
      weight_kg: set.weight_kg,
      reps: set.reps,
    });
  }

  const byWorkout = new Map<string, HistoryExerciseItem[]>();
  for (const exercise of exercises.values()) {
    // Skips the active workout's exercises and anything outside the window.
    if (!workouts.has(exercise.workout_id)) continue;
    exercise.sets.sort((a, b) => a.set_number - b.set_number);
    const list = byWorkout.get(exercise.workout_id) ?? [];
    list.push(exercise);
    byWorkout.set(exercise.workout_id, list);
  }
  for (const list of byWorkout.values()) {
    list.sort((a, b) => a.position - b.position);
  }

  const lifts: LiftItem[] = [...workouts.values()].map((workout) => ({
    kind: "lift",
    id: workout.id,
    at: workout.started_at,
    finished_at: workout.finished_at,
    exercises: byWorkout.get(workout.id) ?? [],
  }));

  const cardio = new Map<string, CardioItem>();
  const putCardio = (row: CardioItem): void => {
    cardio.set(row.id, row);
  };
  for (const session of snapshot.cardio) {
    putCardio({
      kind: "cardio",
      id: session.id,
      at: session.started_at,
      modality: session.modality,
      duration_sec: session.duration_sec,
      distance_m: session.distance_m,
    });
  }
  for (const session of overlay.cardio) {
    if (new Date(session.started_at).getTime() < sinceMs) continue;
    putCardio({
      kind: "cardio",
      id: session.id,
      at: session.started_at,
      modality: session.modality,
      duration_sec: session.duration_sec,
      distance_m: session.distance_m,
    });
  }

  return [...lifts, ...cardio.values()].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
};

export type LiftStats = {
  sets: number;
  volume: number;
  durationMin: number;
  // True for rows written before the timer learned to stop: the session
  // was almost certainly left running rather than trained for that long.
  // The stored value is shown as-is and never rewritten — this flag only
  // buys it a caveat in the expanded detail.
  durationSuspect: boolean;
};

export const liftStats = (item: LiftItem): LiftStats => {
  let sets = 0;
  let volume = 0;
  for (const exercise of item.exercises) {
    for (const set of exercise.sets) {
      sets += 1;
      volume += set.weight_kg * set.reps;
    }
  }
  const started = new Date(item.at).getTime();
  const finished = item.finished_at
    ? new Date(item.finished_at).getTime()
    : started;
  const durationMs = finished - started;
  return {
    sets,
    volume,
    durationMin: Math.max(1, Math.round(durationMs / 60_000)),
    durationSuspect: durationMs >= IMPLAUSIBLE_DURATION_MS,
  };
};

// Workouts carry no title, so the muscle group that took the most sets
// names the row — "Legs Day".
export const dominantMuscle = (item: LiftItem): MuscleGroup | null => {
  const tally = new Map<MuscleGroup, number>();
  for (const exercise of item.exercises) {
    if (!exercise.primary_muscle) continue;
    tally.set(
      exercise.primary_muscle,
      (tally.get(exercise.primary_muscle) ?? 0) + exercise.sets.length,
    );
  }
  let best: MuscleGroup | null = null;
  let bestCount = 0;
  for (const [group, count] of tally) {
    if (count > bestCount) {
      best = group;
      bestCount = count;
    }
  }
  return best;
};
