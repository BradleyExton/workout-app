import type { JSX } from "react";
import { CacheWarmer } from "@/components/system/CacheWarmer";
import { createClient } from "@/lib/supabase/server";
import type { MuscleGroup } from "@/lib/db/types";
import { Hydrator, type ServerSnapshot } from "./ActiveWorkout/Hydrator";

type Params = { id: string };

// The routes a lifter mid-session can still need with no signal: this
// workout (relaunching the PWA into it), the picker for the next
// exercise, and home. The service worker caches each document while we
// are online so those navigations don't dead-end on /offline.
const offlineRoutes = (id: string): string[] => [
  `/workout/${id}`,
  `/workout/new?from=${id}`,
  "/",
];

export default async function ActiveWorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ we?: string | string[] }>;
}): Promise<JSX.Element> {
  const { id } = await params;
  // ?we={workoutExerciseId}: which exercise block to focus (set by the
  // picker when resuming an exercise already in the workout).
  const { we } = await searchParams;
  const initialCurrentWeId = typeof we === "string" && we !== "" ? we : null;
  const supabase = await createClient();

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, started_at, finished_at")
    .eq("id", id)
    .maybeSingle();

  if (!workout) {
    const empty: ServerSnapshot = {
      workout: null,
      workoutExercises: [],
      sets: [],
      lastSession: null,
      prs: [],
    };
    return (
      <>
        <CacheWarmer urls={offlineRoutes(id)} />
        <Hydrator
          workoutId={id}
          server={empty}
          initialCurrentWeId={initialCurrentWeId}
        />
      </>
    );
  }

  const { data: workoutExercises } = await supabase
    .from("workout_exercises")
    .select("id, position, exercise_id, exercise:exercises(id, name, primary_muscle)")
    .eq("workout_id", id)
    .order("position", { ascending: true });

  type RawWE = {
    id: string;
    position: number;
    exercise_id: string;
    exercise:
      | { id: string; name: string; primary_muscle: MuscleGroup }
      | { id: string; name: string; primary_muscle: MuscleGroup }[]
      | null;
  };

  const exercisesList = ((workoutExercises ?? []) as RawWE[]).map((we) => ({
    id: we.id,
    position: we.position,
    exercise_id: we.exercise_id,
    exercise: Array.isArray(we.exercise) ? (we.exercise[0] ?? null) : we.exercise,
  }));
  const current = exercisesList.at(-1) ?? null;

  const { data: rawSets } = exercisesList.length
    ? await supabase
        .from("sets")
        // completed_at is load-bearing, not decoration: the idle logic
        // dates a session by its newest set. Seeding Dexie without it
        // (the old fallback stamped every set at started_at) made a
        // freshly-hydrated workout look untouched since it began, i.e.
        // instantly eligible for auto-close.
        .select("id, set_number, weight_kg, reps, completed_at, workout_exercise_id")
        .in(
          "workout_exercise_id",
          exercisesList.map((we) => we.id),
        )
        .order("set_number", { ascending: true })
    : { data: null };

  const sets = (rawSets ?? []).map((s) => ({
    id: s.id,
    workout_exercise_id: s.workout_exercise_id,
    set_number: s.set_number,
    weight_kg: Number(s.weight_kg),
    reps: s.reps,
    completed_at: s.completed_at,
  }));

  let lastSession: ServerSnapshot["lastSession"] = null;

  if (current?.exercise) {
    const { data: lastWeRow } = await supabase
      .from("sets")
      .select(
        "workout_exercise_id, workout_exercise:workout_exercises!inner(exercise_id, workout:workouts!inner(finished_at))",
      )
      .eq("workout_exercise.exercise_id", current.exercise.id)
      .not("workout_exercise.workout.finished_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastWeRow) {
      const workoutRel = lastWeRow.workout_exercise?.workout;
      const finishedAt = Array.isArray(workoutRel)
        ? workoutRel[0]?.finished_at
        : workoutRel?.finished_at;

      const { data: lastSets } = await supabase
        .from("sets")
        .select("set_number, weight_kg, reps")
        .eq("workout_exercise_id", lastWeRow.workout_exercise_id)
        .order("set_number", { ascending: true });

      if (finishedAt && lastSets) {
        lastSession = {
          exerciseId: current.exercise.id,
          finishedAt,
          sets: lastSets.map((s) => ({
            set_number: s.set_number,
            weight_kg: Number(s.weight_kg),
            reps: s.reps,
          })),
        };
      }
    }
  }

  const exerciseIds = Array.from(
    new Set(exercisesList.map((we) => we.exercise_id)),
  );
  const { data: prRows } = exerciseIds.length
    ? await supabase
        .from("personal_records")
        .select("exercise_id, pr_type, value")
        .in("exercise_id", exerciseIds)
    : { data: null };

  const prs = (prRows ?? []).map((r) => ({
    exercise_id: r.exercise_id,
    pr_type: r.pr_type,
    value: Number(r.value),
  }));

  const snapshot: ServerSnapshot = {
    workout: {
      id: workout.id,
      started_at: workout.started_at,
      finished_at: workout.finished_at,
    },
    workoutExercises: exercisesList,
    sets,
    lastSession,
    prs,
  };

  return (
    <>
      <CacheWarmer urls={offlineRoutes(id)} />
      <Hydrator
        workoutId={id}
        server={snapshot}
        initialCurrentWeId={initialCurrentWeId}
      />
    </>
  );
}
