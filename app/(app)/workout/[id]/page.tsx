import type { JSX } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActiveWorkout } from "./ActiveWorkout";

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

  if (!workout) notFound();
  if (workout.finished_at) redirect("/");

  const { data: workoutExercises } = await supabase
    .from("workout_exercises")
    .select("id, position, exercise:exercises(id, name, primary_muscle)")
    .eq("workout_id", id)
    .order("position", { ascending: true });

  const exercisesList = workoutExercises ?? [];
  const current = exercisesList.at(-1) ?? null;

  const { data: allSets } = exercisesList.length
    ? await supabase
        .from("sets")
        .select("id, set_number, weight_kg, reps, workout_exercise_id")
        .in(
          "workout_exercise_id",
          exercisesList.map((we) => we.id),
        )
        .order("set_number", { ascending: true })
    : { data: null };

  const setsByExercise = new Map<
    string,
    { id: string; set_number: number; weight_kg: number; reps: number }[]
  >();
  for (const set of allSets ?? []) {
    const arr = setsByExercise.get(set.workout_exercise_id) ?? [];
    arr.push({
      id: set.id,
      set_number: set.set_number,
      weight_kg: Number(set.weight_kg),
      reps: set.reps,
    });
    setsByExercise.set(set.workout_exercise_id, arr);
  }

  const currentSets = current ? (setsByExercise.get(current.id) ?? []) : [];

  type LastSessionSet = {
    set_number: number;
    weight_kg: number;
    reps: number;
  };
  let lastSession: { finishedAt: string; sets: LastSessionSet[] } | null = null;

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

  const todayItems = exercisesList
    .filter((we) => we.id !== current?.id && we.exercise !== null)
    .map((we) => {
      const sets = setsByExercise.get(we.id) ?? [];
      return {
        id: we.id,
        name: we.exercise?.name ?? "",
        setCount: sets.length,
        lastWeight: sets.at(-1)?.weight_kg ?? null,
      };
    });

  const totalSets = (allSets ?? []).length;
  const totalVolume = (allSets ?? []).reduce(
    (sum, s) => sum + Number(s.weight_kg) * s.reps,
    0,
  );

  return (
    <ActiveWorkout
      workout={workout}
      current={current}
      currentSets={currentSets}
      lastSession={lastSession}
      todayItems={todayItems}
      stats={{
        sets: totalSets,
        exercises: exercisesList.length,
        volume: totalVolume,
      }}
    />
  );
}
