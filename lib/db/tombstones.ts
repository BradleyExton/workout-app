// Local tombstones for workouts the user has already closed.
//
// Finishing or discarding a workout offline removes it from Dexie long
// before the server hears about it. Until the matching pending op
// drains, every server snapshot the app renders still calls that workout
// active — so the home CTA offers to resume a session that is over, and
// the active-workout page's seed effect writes the whole thing back into
// Dexie. Both need to know "this one is closed locally, ignore the
// server on it".
//
// The pending op IS the tombstone. It exists from the moment the user
// taps finish/discard, it survives every failed drain and every retry
// (markFailed only bumps `attempts`), and `gcSyncedOps` deletes it 24h
// after it syncs — long after the next server render caught up. Keeping
// the fact in the queue entry rather than in a second table means the
// two can never disagree, and it needs no schema version bump.
//
// This mirrors the deleted-set tombstones the Hydrator and HistoryFeed
// already derive from `deleteSet` ops for exactly the same reason.

import { getDb } from "./dexie";
import type { DiscardWorkoutPayload, FinishWorkoutPayload } from "./queue";

export type LocalWorkoutClosures = {
  // Finished or discarded locally: the server's "active" claim is stale.
  closed: Set<string>;
  // Discarded only. Its rows are gone for good, so server-side traces of
  // it (sets still counted in home metrics) are stale too. A *finished*
  // workout keeps its rows, so it must not be filtered out this way.
  discarded: Set<string>;
};

const CLOSING_OPS = new Set(["finishWorkout", "discardWorkout"]);

export const localWorkoutClosures =
  async (): Promise<LocalWorkoutClosures> => {
    const ops = await getDb()
      .pending_ops.filter((op) => CLOSING_OPS.has(op.type))
      .toArray();

    const closed = new Set<string>();
    const discarded = new Set<string>();
    for (const op of ops) {
      const { workout_id } = op.payload as
        | FinishWorkoutPayload
        | DiscardWorkoutPayload;
      if (!workout_id) continue;
      closed.add(workout_id);
      if (op.type === "discardWorkout") discarded.add(workout_id);
    }
    return { closed, discarded };
  };

// Single-id variant for the active-workout page. Scans the same table so
// a liveQuery wrapping it still re-runs when the queue changes.
export const isWorkoutClosedLocally = async (
  workoutId: string,
): Promise<boolean> => {
  const { closed } = await localWorkoutClosures();
  return closed.has(workoutId);
};
