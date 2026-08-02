// The two ways a workout ends, as local-first writes.
//
// Extracted from the finish modal so the automatic paths (IdleGuard's
// "still training?" prompt and its auto-close) end a session through
// exactly the same steps a tap does: mirror-write to Dexie, then enqueue
// the op. Nothing here talks to the network — the enqueued op *is* the
// tombstone that `lib/db/tombstones.ts` derives from, so a session closed
// offline stops being offered as resumable immediately and stays closed
// across reloads until the queue drains.
//
// Draining is the caller's business: the finish modal awaits it so it can
// report unlocks, the background paths fire and forget.

import { getDb } from "./dexie";
import {
  enqueue,
  type DiscardWorkoutPayload,
  type FinishWorkoutPayload,
} from "./queue";

// Both closes run inside one Dexie `rw` transaction that also covers
// `pending_ops`, and both start by looking for an existing closing op.
//
// That combination is the only guard that actually holds. Dexie
// serialises overlapping rw transactions on the same tables, so the
// check-then-write is atomic: a second caller can't read "not closed"
// while the first is mid-write. An in-memory latch cannot promise that —
// it is scoped to one module instance in one tab, and the automatic
// paths fire from a component that closing a session immediately
// navigates away from. Without this, one abandoned workout enqueued
// three identical finish ops, each of which would replay PR and
// achievement detection server-side.
//
// Returns false when someone else already closed it, so callers can tell
// "I did this" from "it was already done" — the difference between
// showing the user a summary and staying quiet.
const alreadyClosing = async (workoutId: string): Promise<boolean> => {
  const existing = await getDb()
    .pending_ops.filter(
      (op) =>
        (op.type === "finishWorkout" || op.type === "discardWorkout") &&
        (op.payload as { workout_id?: string }).workout_id === workoutId,
    )
    .count();
  return existing > 0;
};

export const finishWorkoutLocally = async (
  workoutId: string,
  finishedAtIso: string,
): Promise<boolean> => {
  const db = getDb();
  return db.transaction("rw", [db.workouts, db.pending_ops], async () => {
    if (await alreadyClosing(workoutId)) return false;

    const existing = await db.workouts.get(workoutId);
    if (existing) {
      await db.workouts.update(workoutId, { finished_at: finishedAtIso });
    }
    const payload: FinishWorkoutPayload = {
      workout_id: workoutId,
      finished_at: finishedAtIso,
    };
    await enqueue("finishWorkout", payload);
    return true;
  });
};

export const discardWorkoutLocally = async (
  workoutId: string,
): Promise<boolean> => {
  const db = getDb();
  return db.transaction(
    "rw",
    [db.workouts, db.workout_exercises, db.sets, db.pending_ops],
    async () => {
      if (await alreadyClosing(workoutId)) return false;

      const weIds = await db.workout_exercises
        .where("workout_id")
        .equals(workoutId)
        .primaryKeys();
      if (weIds.length > 0) {
        await db.sets.where("workout_exercise_id").anyOf(weIds).delete();
        await db.workout_exercises
          .where("workout_id")
          .equals(workoutId)
          .delete();
      }
      await db.workouts.delete(workoutId);

      const payload: DiscardWorkoutPayload = { workout_id: workoutId };
      await enqueue("discardWorkout", payload);
      return true;
    },
  );
};
