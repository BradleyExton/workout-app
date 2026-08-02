// Reads the one workout this device currently considers open, plus the
// activity signal the idle logic needs.
//
// Shared by the home resume CTA and the IdleGuard so the two can't
// disagree about whether a session is live. Both wrap these in
// `useLiveQuery`; every table touched here (pending_ops via the
// tombstones, workouts, workout_exercises, sets) is therefore observed,
// so logging a set or draining a finish re-runs the query.

import { getDb } from "./dexie";
import { localWorkoutClosures } from "./tombstones";

export type LocalSession = {
  id: string;
  startedAtMs: number;
  // Newest set's completed_at. null when nothing has been logged yet —
  // the caller falls back to startedAtMs.
  lastSetAtMs: number | null;
  setCount: number;
};

const toMs = (iso: string): number | null => {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
};

export const sessionActivity = async (
  workoutId: string,
): Promise<{ lastSetAtMs: number | null; setCount: number }> => {
  const db = getDb();
  const weIds = await db.workout_exercises
    .where("workout_id")
    .equals(workoutId)
    .primaryKeys();
  if (weIds.length === 0) return { lastSetAtMs: null, setCount: 0 };

  const sets = await db.sets
    .where("workout_exercise_id")
    .anyOf(weIds)
    .toArray();

  let lastSetAtMs: number | null = null;
  for (const set of sets) {
    const ms = toMs(set.completed_at);
    if (ms === null) continue;
    if (lastSetAtMs === null || ms > lastSetAtMs) lastSetAtMs = ms;
  }
  return { lastSetAtMs, setCount: sets.length };
};

// The workout this device is in the middle of, or null.
//
// Deliberately Dexie-only: the idle logic acts on what it finds here, and
// a workout that exists on the server but not in this mirror is one whose
// sets we cannot see. Auto-closing it from a server row alone would mean
// ending a session someone is actively logging on their other phone.
export const localActiveSession = async (): Promise<LocalSession | null> => {
  const { closed } = await localWorkoutClosures();
  const workout = await getDb()
    .workouts.filter((w) => w.finished_at === null && !closed.has(w.id))
    .first();
  if (!workout) return null;

  const startedAtMs = toMs(workout.started_at);
  if (startedAtMs === null) return null;

  const { lastSetAtMs, setCount } = await sessionActivity(workout.id);
  return { id: workout.id, startedAtMs, lastSetAtMs, setCount };
};
