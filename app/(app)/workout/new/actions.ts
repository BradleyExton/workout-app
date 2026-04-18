"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

// 7c-extended: client-generated id + explicit started_at so Dexie and
// Supabase agree on workout identity. Partial unique index on
// workouts(user_id) where finished_at is null will reject a duplicate
// active workout with 23505 — caller's drain handles that as failure.
export const createWorkout = async (formData: FormData): Promise<void> => {
  const id = formData.get("id");
  const startedAt = formData.get("started_at");

  if (typeof id !== "string") return;
  if (typeof startedAt !== "string") return;

  const { supabase, userId } = await requireUserId();

  const { data, error } = await supabase
    .from("workouts")
    .upsert({ id, user_id: userId, started_at: startedAt })
    .select("id");
  if (error) {
    console.error("[createWorkout] upsert failed", error);
    throw new Error("Could not create workout");
  }
  if (!data || data.length === 0) {
    console.error("[createWorkout] no rows affected", { id, userId });
    throw new Error("Could not create workout");
  }
};

// 7c-extended: client computes position from Dexie (server sets can lag
// offline). Upsert on id for drain idempotency; a (workout_id, position)
// conflict surfaces as 23505 and fails the op — resolved in 7e.
export const addExercise = async (formData: FormData): Promise<void> => {
  const id = formData.get("id");
  const workoutId = formData.get("workoutId");
  const exerciseId = formData.get("exerciseId");
  const positionStr = formData.get("position");

  if (typeof id !== "string") return;
  if (typeof workoutId !== "string") return;
  if (typeof exerciseId !== "string") return;
  if (typeof positionStr !== "string") return;

  const position = Number(positionStr);
  if (!Number.isInteger(position) || position < 1) return;

  const { supabase, userId } = await requireUserId();

  // Verify workout ownership.
  const { data: workoutCheck } = await supabase
    .from("workouts")
    .select("id, user_id")
    .eq("id", workoutId)
    .maybeSingle();
  if (!workoutCheck || workoutCheck.user_id !== userId) {
    console.error("[addExercise] ownership check failed", { workoutId, userId });
    throw new Error("Not allowed");
  }

  const { data, error } = await supabase
    .from("workout_exercises")
    .upsert({ id, workout_id: workoutId, exercise_id: exerciseId, position })
    .select("id");
  if (error) {
    console.error("[addExercise] upsert failed", error);
    throw new Error("Could not add exercise");
  }
  if (!data || data.length === 0) {
    console.error("[addExercise] no rows affected", { id });
    throw new Error("Could not add exercise");
  }

  revalidatePath(`/workout/${workoutId}`);
};
