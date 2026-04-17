"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const logSet = async (formData: FormData): Promise<void> => {
  const workoutExerciseId = formData.get("workoutExerciseId");
  const weightStr = formData.get("weight_kg");
  const repsStr = formData.get("reps");

  if (typeof workoutExerciseId !== "string") return;
  if (typeof weightStr !== "string" || typeof repsStr !== "string") return;

  const weight_kg = Number(weightStr);
  const reps = Number(repsStr);
  if (!Number.isFinite(weight_kg) || weight_kg < 0) return;
  if (!Number.isInteger(reps) || reps < 0) return;

  const supabase = await createClient();

  const { data: lastSet } = await supabase
    .from("sets")
    .select("set_number, workout_exercise_id")
    .eq("workout_exercise_id", workoutExerciseId)
    .order("set_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const set_number = (lastSet?.set_number ?? 0) + 1;

  const { data: inserted, error } = await supabase
    .from("sets")
    .insert({
      workout_exercise_id: workoutExerciseId,
      set_number,
      weight_kg,
      reps,
    })
    .select("id, workout_exercise_id")
    .single();
  if (error || !inserted) throw error ?? new Error("Failed to log set");

  const { data: we } = await supabase
    .from("workout_exercises")
    .select("workout_id")
    .eq("id", inserted.workout_exercise_id)
    .single();

  if (we?.workout_id) revalidatePath(`/workout/${we.workout_id}`);
};

export const finishWorkout = async (formData: FormData): Promise<void> => {
  const workoutId = formData.get("workoutId");
  if (typeof workoutId !== "string") return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", workoutId);
  if (error) throw error;

  revalidatePath("/");
  redirect("/");
};

export const discardWorkout = async (formData: FormData): Promise<void> => {
  const workoutId = formData.get("workoutId");
  if (typeof workoutId !== "string") return;

  const supabase = await createClient();
  const { error } = await supabase.from("workouts").delete().eq("id", workoutId);
  if (error) throw error;

  revalidatePath("/");
  redirect("/");
};
