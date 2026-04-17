"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const addExerciseToWorkout = async (formData: FormData): Promise<void> => {
  const exerciseId = formData.get("exerciseId");
  if (typeof exerciseId !== "string") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: active } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", user.id)
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let workoutId = active?.id;
  if (!workoutId) {
    const { data: created, error } = await supabase
      .from("workouts")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (error || !created) throw error ?? new Error("Failed to create workout");
    workoutId = created.id;
  }

  const { data: lastPos } = await supabase
    .from("workout_exercises")
    .select("position")
    .eq("workout_id", workoutId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (lastPos?.position ?? 0) + 1;

  const { error: insertError } = await supabase
    .from("workout_exercises")
    .insert({ workout_id: workoutId, exercise_id: exerciseId, position });
  if (insertError) throw insertError;

  redirect(`/workout/${workoutId}`);
};
