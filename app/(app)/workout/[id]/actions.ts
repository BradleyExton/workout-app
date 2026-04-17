"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Shared auth-gate for mutating actions. Returns the user id or redirects
// to /login — never returns null. Every mutation should also include
// .eq("user_id", user.id) in addition to RLS.
const requireUserId = async (): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
};

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

  const { supabase, userId } = await requireUserId();

  // Verify ownership by walking workout_exercise -> workout.user_id.
  const { data: ownerCheck } = await supabase
    .from("workout_exercises")
    .select("workout_id, workouts!inner(user_id)")
    .eq("id", workoutExerciseId)
    .maybeSingle();
  const workoutUserId = Array.isArray(ownerCheck?.workouts)
    ? ownerCheck?.workouts[0]?.user_id
    : ownerCheck?.workouts?.user_id;
  if (!ownerCheck || workoutUserId !== userId) {
    console.error("[logSet] ownership check failed", { workoutExerciseId, userId });
    throw new Error("Not allowed");
  }
  const workoutId = ownerCheck.workout_id;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: lastSet } = await supabase
      .from("sets")
      .select("set_number")
      .eq("workout_exercise_id", workoutExerciseId)
      .order("set_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const set_number = (lastSet?.set_number ?? 0) + 1;

    const { error } = await supabase
      .from("sets")
      .insert({
        workout_exercise_id: workoutExerciseId,
        set_number,
        weight_kg,
        reps,
      })
      .select("id")
      .single();

    if (!error) {
      revalidatePath(`/workout/${workoutId}`);
      return;
    }
    if (error.code !== "23505") {
      console.error("[logSet] insert set failed", error);
      throw new Error("Could not log set");
    }
    // 23505: set_number collision with a concurrent write. Retry once.
  }

  throw new Error("Could not log set (conflict)");
};

export const finishWorkout = async (formData: FormData): Promise<void> => {
  const workoutId = formData.get("workoutId");
  if (typeof workoutId !== "string") return;

  const { supabase, userId } = await requireUserId();

  const { data, error } = await supabase
    .from("workouts")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", workoutId)
    .eq("user_id", userId)
    .select("id");
  if (error) {
    console.error("[finishWorkout] update failed", error);
    throw new Error("Could not finish workout");
  }
  if (!data || data.length === 0) {
    console.error("[finishWorkout] no rows affected", { workoutId, userId });
    throw new Error("Workout not found");
  }

  revalidatePath("/", "layout");
  redirect("/");
};

export const discardWorkout = async (formData: FormData): Promise<void> => {
  const workoutId = formData.get("workoutId");
  if (typeof workoutId !== "string") return;

  const { supabase, userId } = await requireUserId();

  const { data, error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .eq("user_id", userId)
    .select("id");
  if (error) {
    console.error("[discardWorkout] delete failed", error);
    throw new Error("Could not discard workout");
  }
  if (!data || data.length === 0) {
    console.error("[discardWorkout] no rows affected", { workoutId, userId });
    throw new Error("Workout not found");
  }

  revalidatePath("/", "layout");
  redirect("/");
};
