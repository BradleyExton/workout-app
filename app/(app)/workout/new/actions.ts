"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";

const findActiveWorkout = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ id: string } | null> => {
  const { data } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", userId)
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
};

export const addExerciseToWorkout = async (formData: FormData): Promise<void> => {
  const exerciseId = formData.get("exerciseId");
  if (typeof exerciseId !== "string") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let workoutId = (await findActiveWorkout(supabase, user.id))?.id;

  if (!workoutId) {
    const { data: created, error } = await supabase
      .from("workouts")
      .insert({ user_id: user.id, started_at: new Date().toISOString() })
      .select("id")
      .single();

    if (error?.code === "23505") {
      // Partial unique index fired: another tab or tap already inserted one.
      // Re-fetch and continue.
      workoutId = (await findActiveWorkout(supabase, user.id))?.id;
    } else if (error || !created) {
      console.error("[addExerciseToWorkout] insert workout failed", error);
      throw new Error("Could not start workout");
    } else {
      workoutId = created.id;
    }
  }

  if (!workoutId) {
    throw new Error("Could not start workout");
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
  if (insertError) {
    console.error("[addExerciseToWorkout] insert workout_exercise failed", insertError);
    throw new Error("Could not add exercise");
  }

  redirect(`/workout/${workoutId}`);
};
