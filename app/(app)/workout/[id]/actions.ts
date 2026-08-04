"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { detectPRs, type ExistingPr, type SetForPr } from "@/lib/domain/pr";
import {
  detectUnlocks,
  type AchievementSlug,
  type AchievementStats,
} from "@/lib/domain/achievements";
import type { MuscleGroup } from "@/lib/db/types";

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

export type LogSetResult = {
  id: string;
  set_number: number;
};

export const logSet = async (formData: FormData): Promise<LogSetResult> => {
  // Client generates `id` + `set_number`. Upsert on id is idempotent
  // against queue-drain retries. A (workout_exercise_id, set_number)
  // conflict (23505) means another op already claimed that slot — most
  // commonly because the queue is replaying after a sync where the
  // server picked up a concurrent write. We re-read max(set_number)+1
  // and retry once; the dispatcher patches the Dexie row to the
  // resolved set_number.
  const id = formData.get("id");
  const workoutExerciseId = formData.get("workoutExerciseId");
  const setNumberStr = formData.get("set_number");
  const weightStr = formData.get("weight_kg");
  const repsStr = formData.get("reps");

  if (typeof id !== "string") throw new Error("Invalid id");
  if (typeof workoutExerciseId !== "string")
    throw new Error("Invalid workoutExerciseId");
  if (typeof setNumberStr !== "string") throw new Error("Invalid set_number");
  if (typeof weightStr !== "string" || typeof repsStr !== "string")
    throw new Error("Invalid weight or reps");

  const setNumber = Number(setNumberStr);
  const weight_kg = Number(weightStr);
  const reps = Number(repsStr);
  if (!Number.isInteger(setNumber) || setNumber <= 0)
    throw new Error("Invalid set_number");
  if (!Number.isFinite(weight_kg) || weight_kg < 0)
    throw new Error("Invalid weight");
  if (!Number.isInteger(reps) || reps < 0) throw new Error("Invalid reps");

  const { supabase, userId } = await requireUserId();

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

  const tryUpsert = async (sn: number) =>
    supabase
      .from("sets")
      .upsert({
        id,
        workout_exercise_id: workoutExerciseId,
        set_number: sn,
        weight_kg,
        reps,
      })
      .select("id, set_number");

  let { data, error } = await tryUpsert(setNumber);
  let resolvedSetNumber = setNumber;

  if (error?.code === "23505") {
    const { data: maxRow } = await supabase
      .from("sets")
      .select("set_number")
      .eq("workout_exercise_id", workoutExerciseId)
      .order("set_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const bumped = (maxRow?.set_number ?? 0) + 1;
    const retry = await tryUpsert(bumped);
    data = retry.data;
    error = retry.error;
    resolvedSetNumber = bumped;
  }

  if (error) {
    console.error("[logSet] upsert set failed", error);
    throw new Error("Could not log set");
  }
  if (!data || data.length === 0) {
    console.error("[logSet] no rows affected", { id });
    throw new Error("Could not log set");
  }

  revalidatePath(`/workout/${workoutId}`);

  return { id, set_number: data[0].set_number ?? resolvedSetNumber };
};

// Ownership check shared by updateSet/deleteSet: resolves the set's
// workout id iff the set belongs to this user. Missing row → null, which
// callers treat as already-deleted (idempotent against drain retries).
const resolveOwnedSet = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  setId: string,
): Promise<string | null> => {
  const { data } = await supabase
    .from("sets")
    .select("id, workout_exercises!inner(workout_id, workouts!inner(user_id))")
    .eq("id", setId)
    .maybeSingle();
  if (!data) return null;
  const we = Array.isArray(data.workout_exercises)
    ? data.workout_exercises[0]
    : data.workout_exercises;
  const ownerId = Array.isArray(we?.workouts)
    ? we?.workouts[0]?.user_id
    : we?.workouts?.user_id;
  if (ownerId !== userId) throw new Error("Not allowed");
  return we?.workout_id ?? null;
};

export const updateSet = async (formData: FormData): Promise<void> => {
  const id = formData.get("id");
  const weightStr = formData.get("weight_kg");
  const repsStr = formData.get("reps");

  if (typeof id !== "string") throw new Error("Invalid id");
  if (typeof weightStr !== "string" || typeof repsStr !== "string")
    throw new Error("Invalid weight or reps");

  const weight_kg = Number(weightStr);
  const reps = Number(repsStr);
  if (!Number.isFinite(weight_kg) || weight_kg < 0)
    throw new Error("Invalid weight");
  if (!Number.isInteger(reps) || reps < 0) throw new Error("Invalid reps");

  const { supabase, userId } = await requireUserId();

  const workoutId = await resolveOwnedSet(supabase, userId, id);
  // Already gone (deleted before this op drained) — nothing to update.
  if (workoutId === null) return;

  const { error } = await supabase
    .from("sets")
    .update({ weight_kg, reps })
    .eq("id", id);
  if (error) {
    console.error("[updateSet] update failed", error);
    throw new Error("Could not update set");
  }

  revalidatePath(`/workout/${workoutId}`);
};

export const deleteSet = async (formData: FormData): Promise<void> => {
  const id = formData.get("id");
  if (typeof id !== "string") throw new Error("Invalid id");

  const { supabase, userId } = await requireUserId();

  const workoutId = await resolveOwnedSet(supabase, userId, id);
  // Idempotent: already deleted is success.
  if (workoutId === null) return;

  const { error } = await supabase.from("sets").delete().eq("id", id);
  if (error) {
    console.error("[deleteSet] delete failed", error);
    throw new Error("Could not delete set");
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

  await detectAndInsertPRs(supabase, userId, workoutId);
  await detectAndInsertUnlocks(supabase, userId);

  revalidatePath("/", "layout");
};

const detectAndInsertPRs = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  workoutId: string,
): Promise<void> => {
  const { data: setRows, error: setsError } = await supabase
    .from("sets")
    .select(
      "id, weight_kg, reps, completed_at, workout_exercises!inner(workout_id, exercise_id)",
    )
    .eq("workout_exercises.workout_id", workoutId);

  if (setsError) {
    console.error("[finishWorkout] fetch sets for PRs failed", setsError);
    return;
  }
  if (!setRows || setRows.length === 0) return;

  const newSets: SetForPr[] = setRows.flatMap((row) => {
    const we = Array.isArray(row.workout_exercises)
      ? row.workout_exercises[0]
      : row.workout_exercises;
    if (!we) return [];
    return [
      {
        id: row.id,
        exercise_id: we.exercise_id,
        weight_kg: Number(row.weight_kg),
        reps: Number(row.reps),
        completed_at: row.completed_at,
      },
    ];
  });
  if (newSets.length === 0) return;

  const exerciseIds = Array.from(new Set(newSets.map((s) => s.exercise_id)));
  const { data: priorRows, error: priorError } = await supabase
    .from("personal_records")
    .select("exercise_id, pr_type, value")
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds);

  if (priorError) {
    console.error("[finishWorkout] fetch existing PRs failed", priorError);
    return;
  }

  const existing: ExistingPr[] = (priorRows ?? []).map((r) => ({
    exercise_id: r.exercise_id,
    pr_type: r.pr_type,
    value: Number(r.value),
  }));

  const newPrs = detectPRs(existing, newSets);
  if (newPrs.length === 0) return;

  const { error: insertError } = await supabase.from("personal_records").insert(
    newPrs.map((pr) => ({
      user_id: userId,
      exercise_id: pr.exercise_id,
      pr_type: pr.pr_type,
      value: pr.value,
      set_id: pr.set_id,
      achieved_at: pr.achieved_at,
    })),
  );
  if (insertError) {
    console.error("[finishWorkout] insert PRs failed", insertError);
  }
};

const MS_PER_DAY = 86_400_000;
const SETS_PAGE_SIZE = 10_000;

const detectAndInsertUnlocks = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<void> => {
  const weekAgoIso = new Date(Date.now() - 7 * MS_PER_DAY).toISOString();

  const [
    { count: workoutsFinished, error: workoutsErr },
    { count: prCount, error: prErr },
    { data: workoutRows, error: workoutRowsErr },
    { data: weekSetRows, error: weekSetsErr },
    { data: allSetRows, error: allSetsErr },
    { data: unlockedRows, error: unlockedErr },
  ] = await Promise.all([
    supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("finished_at", "is", null),
    supabase
      .from("personal_records")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("workouts")
      .select("started_at")
      .eq("user_id", userId)
      .not("finished_at", "is", null)
      .gte("started_at", new Date(Date.now() - 60 * MS_PER_DAY).toISOString()),
    supabase
      .from("sets")
      .select(
        "workout_exercise:workout_exercises!inner(exercise:exercises!inner(primary_muscle))",
      )
      .gte("completed_at", weekAgoIso),
    supabase
      .from("sets")
      .select("weight_kg, reps")
      .range(0, SETS_PAGE_SIZE - 1),
    supabase
      .from("user_achievements")
      .select("achievement_id, achievement:achievements!inner(slug)")
      .eq("user_id", userId),
  ]);

  if (
    workoutsErr ||
    prErr ||
    workoutRowsErr ||
    weekSetsErr ||
    allSetsErr ||
    unlockedErr
  ) {
    console.error("[finishWorkout] unlock stats fetch failed", {
      workoutsErr,
      prErr,
      workoutRowsErr,
      weekSetsErr,
      allSetsErr,
      unlockedErr,
    });
    return;
  }

  const streakDays = computeStreakDays(
    (workoutRows ?? []).map((w) => w.started_at),
    new Date(),
  );

  type WeekSetRow = {
    workout_exercise:
      | { exercise: { primary_muscle: MuscleGroup } | { primary_muscle: MuscleGroup }[] | null }
      | { exercise: { primary_muscle: MuscleGroup } | { primary_muscle: MuscleGroup }[] | null }[]
      | null;
  };
  const muscleGroups = new Set<MuscleGroup>();
  for (const row of (weekSetRows ?? []) as WeekSetRow[]) {
    const we = Array.isArray(row.workout_exercise)
      ? row.workout_exercise[0]
      : row.workout_exercise;
    if (!we) continue;
    const ex = Array.isArray(we.exercise) ? we.exercise[0] : we.exercise;
    if (ex) muscleGroups.add(ex.primary_muscle);
  }

  const lifetimeVolume = (allSetRows ?? []).reduce(
    (sum, r) => sum + Number(r.weight_kg) * Number(r.reps),
    0,
  );

  const stats: AchievementStats = {
    workoutsFinished: workoutsFinished ?? 0,
    streakDays,
    prCount: prCount ?? 0,
    muscleGroupsThisWeek: muscleGroups.size,
    lifetimeVolume,
  };

  type UnlockedRow = {
    achievement_id: string;
    achievement: { slug: string } | { slug: string }[] | null;
  };
  const alreadyUnlocked: AchievementSlug[] = [];
  const unlockedIdBySlug = new Map<string, string>();
  for (const row of (unlockedRows ?? []) as UnlockedRow[]) {
    const ach = Array.isArray(row.achievement) ? row.achievement[0] : row.achievement;
    if (!ach) continue;
    alreadyUnlocked.push(ach.slug as AchievementSlug);
    unlockedIdBySlug.set(ach.slug, row.achievement_id);
  }

  const newSlugs = detectUnlocks(stats, alreadyUnlocked);
  if (newSlugs.length === 0) return;

  const { data: achRows, error: achErr } = await supabase
    .from("achievements")
    .select("id, slug")
    .in("slug", newSlugs);
  if (achErr) {
    console.error("[finishWorkout] fetch achievement ids failed", achErr);
    return;
  }

  const nowIso = new Date().toISOString();
  const toInsert = (achRows ?? []).map((row) => ({
    user_id: userId,
    achievement_id: row.id,
    unlocked_at: nowIso,
  }));
  if (toInsert.length === 0) return;

  const { error: insertErr } = await supabase
    .from("user_achievements")
    .insert(toInsert);
  if (insertErr) {
    console.error("[finishWorkout] insert user_achievements failed", insertErr);
  }
};

const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

const computeStreakDays = (startedAts: string[], now: Date): number => {
  const workoutDays = new Set(
    startedAts.map((iso) => dayKey(new Date(iso))),
  );
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getTime() - MS_PER_DAY));
  let cursor = workoutDays.has(today)
    ? new Date(now)
    : workoutDays.has(yesterday)
      ? new Date(now.getTime() - MS_PER_DAY)
      : null;
  let streak = 0;
  while (cursor && workoutDays.has(dayKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }
  return streak;
};

export type WorkoutUnlockPr = {
  pr_type: "1rm" | "volume" | "reps";
  value: number;
  exercise_name: string;
};

export type WorkoutUnlockAchievement = {
  slug: string;
  title: string;
};

export type WorkoutUnlocks = {
  newPrs: WorkoutUnlockPr[];
  newAchievements: WorkoutUnlockAchievement[];
};

// Called by the finish modal after drainQueue() lands, to surface the
// unlocks inserted during that workout's finish. Best-effort — any
// failure returns empty rather than throwing, so we never block the
// redirect to home.
export const getWorkoutUnlocks = async (
  workoutId: string,
): Promise<WorkoutUnlocks> => {
  const empty: WorkoutUnlocks = { newPrs: [], newAchievements: [] };
  const { supabase, userId } = await requireUserId();

  const { data: workoutRow, error: wErr } = await supabase
    .from("workouts")
    .select("finished_at")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .maybeSingle();
  if (wErr || !workoutRow?.finished_at) return empty;

  const { data: setRows, error: setsErr } = await supabase
    .from("sets")
    .select("id, workout_exercises!inner(workout_id)")
    .eq("workout_exercises.workout_id", workoutId);
  if (setsErr) return empty;
  const setIds = (setRows ?? []).map((r) => r.id);

  type PrRow = {
    pr_type: "1rm" | "volume" | "reps";
    value: number;
    exercise: { name: string } | { name: string }[] | null;
  };

  const prsQuery = setIds.length
    ? await supabase
        .from("personal_records")
        .select("pr_type, value, exercise:exercises!inner(name)")
        .eq("user_id", userId)
        .in("set_id", setIds)
    : { data: [] as PrRow[], error: null };

  if (prsQuery.error) return empty;

  const finishedAtMs = new Date(workoutRow.finished_at).getTime();
  const cutoff = new Date(finishedAtMs - 5_000).toISOString();

  type AckRow = {
    achievement:
      | { slug: string; title: string }
      | { slug: string; title: string }[]
      | null;
  };

  const { data: acksData, error: acksErr } = await supabase
    .from("user_achievements")
    .select("achievement:achievements!inner(slug, title)")
    .eq("user_id", userId)
    .gte("unlocked_at", cutoff);
  if (acksErr) return empty;

  const newPrs: WorkoutUnlockPr[] = (prsQuery.data as PrRow[]).flatMap((r) => {
    const ex = Array.isArray(r.exercise) ? r.exercise[0] : r.exercise;
    if (!ex) return [];
    return [
      {
        pr_type: r.pr_type,
        value: Number(r.value),
        exercise_name: ex.name,
      },
    ];
  });

  const newAchievements: WorkoutUnlockAchievement[] = (
    (acksData ?? []) as AckRow[]
  ).flatMap((r) => {
    const a = Array.isArray(r.achievement) ? r.achievement[0] : r.achievement;
    if (!a) return [];
    return [{ slug: a.slug, title: a.title }];
  });

  return { newPrs, newAchievements };
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
