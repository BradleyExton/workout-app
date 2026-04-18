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
  // 7c: client generates `id` + `set_number` so the Dexie row and the
  // Supabase row share an id. Upsert on id is idempotent against
  // queue-drain retries. A (workout_exercise_id, set_number) conflict
  // surfaces as 23505 and fails the op — resolved in phase 7e.
  const id = formData.get("id");
  const workoutExerciseId = formData.get("workoutExerciseId");
  const setNumberStr = formData.get("set_number");
  const weightStr = formData.get("weight_kg");
  const repsStr = formData.get("reps");

  if (typeof id !== "string") return;
  if (typeof workoutExerciseId !== "string") return;
  if (typeof setNumberStr !== "string") return;
  if (typeof weightStr !== "string" || typeof repsStr !== "string") return;

  const set_number = Number(setNumberStr);
  const weight_kg = Number(weightStr);
  const reps = Number(repsStr);
  if (!Number.isInteger(set_number) || set_number <= 0) return;
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

  const { data, error } = await supabase
    .from("sets")
    .upsert({
      id,
      workout_exercise_id: workoutExerciseId,
      set_number,
      weight_kg,
      reps,
    })
    .select("id");
  if (error) {
    console.error("[logSet] upsert set failed", error);
    throw new Error("Could not log set");
  }
  if (!data || data.length === 0) {
    console.error("[logSet] no rows affected", { id });
    throw new Error("Could not log set");
  }

  revalidatePath(`/workout/${workoutId}`);
};

export const finishWorkout = async (formData: FormData): Promise<void> => {
  const workoutId = formData.get("workoutId");
  const finishedAt = formData.get("finished_at");
  if (typeof workoutId !== "string") return;
  // Client-provided finished_at so Dexie and Supabase agree on the
  // completion time even if the drain fires minutes after the user tapped
  // Finish. Falls back to server now() if the client didn't provide one
  // (e.g., legacy call path).
  const timestamp =
    typeof finishedAt === "string" && finishedAt !== ""
      ? finishedAt
      : new Date().toISOString();

  const { supabase, userId } = await requireUserId();

  const { data, error } = await supabase
    .from("workouts")
    .update({ finished_at: timestamp })
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
};

export const discardWorkout = async (formData: FormData): Promise<void> => {
  const workoutId = formData.get("workoutId");
  if (typeof workoutId !== "string") return;

  const { supabase, userId } = await requireUserId();

  // Idempotent: if the row is already gone (e.g., drain retried after
  // success), we don't want to throw. .select() returns [] and we treat
  // that as success rather than failure.
  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .eq("user_id", userId)
    .select("id");
  if (error) {
    console.error("[discardWorkout] delete failed", error);
    throw new Error("Could not discard workout");
  }

  revalidatePath("/", "layout");
};
