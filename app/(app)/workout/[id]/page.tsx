import type { JSX } from "react";
import { createClient } from "@/lib/supabase/server";
import type { MuscleGroup } from "@/lib/db/types";
import { Hydrator, type ServerSnapshot } from "./ActiveWorkout/Hydrator";

type Params = { id: string };

export default async function ActiveWorkoutPage({
  params,
}: {
  params: Promise<Params>;
}): Promise<JSX.Element> {
  const { id } = await params;
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
    };
    return <Hydrator workoutId={id} server={empty} />;
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
        .select("id, set_number, weight_kg, reps, workout_exercise_id")
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

  const snapshot: ServerSnapshot = {
    workout: {
      id: workout.id,
      started_at: workout.started_at,
      finished_at: workout.finished_at,
    },
    workoutExercises: exercisesList,
    sets,
    lastSession,
  };

  return <Hydrator workoutId={id} server={snapshot} />;
}
