import type { JSX } from "react";
import { currentDate, isoDaysAgo } from "@/lib/domain/time";
import type { HistorySnapshot } from "@/lib/domain/history";
import { createClient } from "@/lib/supabase/server";
import type { CardioModality, MuscleGroup } from "@/lib/db/types";
import { HistoryFeed } from "./HistoryFeed";
import { historyCopy } from "./copy";
import * as styles from "./styles";

const HISTORY_DAYS = 180;

// The snapshot ships the full detail (exercises + every set) with the
// list, not on demand: the service worker only caches whole navigations,
// so a lazily-fetched detail would be a dead end offline. Same row count
// as the old summary query — the rows are just wider.
export default async function HistoryPage(): Promise<JSX.Element> {
  const supabase = await createClient();
  const now = currentDate();
  const since = isoDaysAgo(HISTORY_DAYS);

  const [{ data: rawWorkouts }, { data: rawSets }, { data: rawCardio }] =
    await Promise.all([
      supabase
        .from("workouts")
        .select("id, started_at, finished_at")
        .not("finished_at", "is", null)
        .gte("started_at", since)
        .order("started_at", { ascending: false }),
      supabase
        .from("sets")
        .select(
          "id, set_number, weight_kg, reps, workout_exercise:workout_exercises!inner(id, workout_id, position, exercise:exercises!inner(name, primary_muscle))",
        )
        .gte("completed_at", since),
      supabase
        .from("cardio_sessions")
        .select("id, started_at, duration_sec, distance_m, modality")
        .gte("started_at", since)
        .order("started_at", { ascending: false }),
    ]);

  type RawExercise = { name: string; primary_muscle: MuscleGroup };
  type RawWorkoutExercise = {
    id: string;
    workout_id: string;
    position: number;
    exercise: RawExercise | RawExercise[] | null;
  };
  type RawSetRow = {
    id: string;
    set_number: number;
    weight_kg: number | string;
    reps: number;
    workout_exercise: RawWorkoutExercise | RawWorkoutExercise[] | null;
  };

  const exercises = new Map<string, HistorySnapshot["exercises"][number]>();
  const sets: HistorySnapshot["sets"] = [];

  for (const row of (rawSets ?? []) as RawSetRow[]) {
    const we = Array.isArray(row.workout_exercise)
      ? row.workout_exercise[0]
      : row.workout_exercise;
    if (!we) continue;

    if (!exercises.has(we.id)) {
      const exercise = Array.isArray(we.exercise) ? we.exercise[0] : we.exercise;
      exercises.set(we.id, {
        id: we.id,
        workout_id: we.workout_id,
        position: we.position,
        name: exercise?.name ?? null,
        primary_muscle: exercise?.primary_muscle ?? null,
      });
    }

    sets.push({
      id: row.id,
      workout_exercise_id: we.id,
      set_number: row.set_number,
      weight_kg: Number(row.weight_kg),
      reps: row.reps,
    });
  }

  const snapshot: HistorySnapshot = {
    workouts: (rawWorkouts ?? []).map((workout) => ({
      id: workout.id,
      started_at: workout.started_at,
      finished_at: workout.finished_at,
    })),
    exercises: [...exercises.values()],
    sets,
    cardio: (rawCardio ?? []).map((session) => ({
      id: session.id,
      started_at: session.started_at,
      modality: session.modality as CardioModality,
      duration_sec: session.duration_sec,
      distance_m: session.distance_m,
    })),
  };

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{historyCopy.title}</h1>
      <HistoryFeed
        snapshot={snapshot}
        nowMs={now.getTime()}
        sinceMs={new Date(since).getTime()}
      />
    </main>
  );
}
