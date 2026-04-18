// Write-queue primitives + drain path.
//
// Producers (CurrentSetForm, picker, finish controls, cardio form)
// mirror-write to Dexie and then enqueue. Drain (QueueSyncer + explicit
// best-effort after each write) dispatches to the matching server action
// via client-side import. Upsert-on-id on the server side makes retries
// idempotent.

import {
  createWorkout as createWorkoutAction,
  addExercise as addExerciseAction,
} from "@/app/(app)/workout/new/actions";
import {
  logSet as logSetAction,
  finishWorkout as finishWorkoutAction,
  discardWorkout as discardWorkoutAction,
} from "@/app/(app)/workout/[id]/actions";
import { logCardio as logCardioAction } from "@/app/(app)/cardio/new/actions";
import { getDb, type PendingOp, type PendingOpType } from "./dexie";
import { newId } from "./ids";

export type QueueItem<T = unknown> = {
  id: string;
  type: PendingOpType;
  payload: T;
  created_at: string;
  attempts: number;
  last_attempt_at: string | null;
};

export type CreateWorkoutPayload = {
  id: string;
  started_at: string;
};

export type AddExercisePayload = {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
};

export type LogSetPayload = {
  id: string;
  workoutExerciseId: string;
  set_number: number;
  weight_kg: number;
  reps: number;
};

export type FinishWorkoutPayload = {
  workout_id: string;
  finished_at: string;
};

export type DiscardWorkoutPayload = {
  workout_id: string;
};

export type LogCardioPayload = {
  id: string;
  modality: "walk" | "run" | "treadmill";
  started_at: string;
  duration_sec: number;
  distance_m: number | null;
};

export const enqueue = async <T>(
  type: PendingOpType,
  payload: T,
): Promise<string> => {
  const id = newId();
  const op: PendingOp = {
    id,
    type,
    payload,
    created_at: new Date().toISOString(),
    synced_at: null,
    attempts: 0,
    last_error: null,
    last_attempt_at: null,
  };
  await getDb().pending_ops.put(op);
  return id;
};

export const pendingCount = async (): Promise<number> => {
  return getDb().pending_ops.filter((op) => op.synced_at === null).count();
};

export const peekPending = async (limit = 20): Promise<QueueItem[]> => {
  const rows = await getDb()
    .pending_ops.filter((op) => op.synced_at === null)
    .sortBy("created_at");
  return rows.slice(0, limit).map((row) => ({
    id: row.id,
    type: row.type,
    payload: row.payload,
    created_at: row.created_at,
    attempts: row.attempts,
    last_attempt_at: row.last_attempt_at,
  }));
};

export const markSynced = async (id: string): Promise<void> => {
  await getDb().pending_ops.update(id, {
    synced_at: new Date().toISOString(),
    last_error: null,
  });
};

export const markFailed = async (id: string, error: string): Promise<void> => {
  const row = await getDb().pending_ops.get(id);
  if (!row) return;
  await getDb().pending_ops.update(id, {
    attempts: row.attempts + 1,
    last_error: error,
    last_attempt_at: new Date().toISOString(),
  });
};

const SYNCED_TTL_MS = 24 * 60 * 60 * 1000;

// Synced ops accumulate forever otherwise. Called from QueueSyncer on
// mount to keep the table from growing unbounded.
export const gcSyncedOps = async (now = Date.now()): Promise<number> => {
  const cutoff = new Date(now - SYNCED_TTL_MS).toISOString();
  const stale = await getDb()
    .pending_ops.filter(
      (op) => op.synced_at !== null && op.synced_at < cutoff,
    )
    .primaryKeys();
  if (stale.length === 0) return 0;
  await getDb().pending_ops.bulkDelete(stale);
  return stale.length;
};

// Exponential backoff: 30s, 60s, 120s, 240s, capped at 600s.
const BACKOFF_BASE_MS = 30_000;
const BACKOFF_CAP_MS = 600_000;
const backoffMs = (attempts: number): number =>
  Math.min(BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1), BACKOFF_CAP_MS);

const inBackoff = (item: QueueItem, now: number): boolean => {
  if (item.attempts === 0 || !item.last_attempt_at) return false;
  const last = new Date(item.last_attempt_at).getTime();
  return now - last < backoffMs(item.attempts);
};

const dispatchOp = async (item: QueueItem): Promise<void> => {
  switch (item.type) {
    case "createWorkout": {
      const p = item.payload as CreateWorkoutPayload;
      const fd = new FormData();
      fd.append("id", p.id);
      fd.append("started_at", p.started_at);
      await createWorkoutAction(fd);
      return;
    }
    case "addExercise": {
      const p = item.payload as AddExercisePayload;
      const fd = new FormData();
      fd.append("id", p.id);
      fd.append("workoutId", p.workout_id);
      fd.append("exerciseId", p.exercise_id);
      fd.append("position", String(p.position));
      await addExerciseAction(fd);
      return;
    }
    case "logSet": {
      const p = item.payload as LogSetPayload;
      const fd = new FormData();
      fd.append("id", p.id);
      fd.append("workoutExerciseId", p.workoutExerciseId);
      fd.append("set_number", String(p.set_number));
      fd.append("weight_kg", String(p.weight_kg));
      fd.append("reps", String(p.reps));
      const result = await logSetAction(fd);
      if (result.set_number !== p.set_number) {
        // Server resolved a (workout_exercise_id, set_number) collision
        // by bumping. Patch the Dexie row so the merge stays consistent.
        await getDb().sets.update(p.id, { set_number: result.set_number });
      }
      return;
    }
    case "finishWorkout": {
      const p = item.payload as FinishWorkoutPayload;
      const fd = new FormData();
      fd.append("workoutId", p.workout_id);
      fd.append("finished_at", p.finished_at);
      await finishWorkoutAction(fd);
      return;
    }
    case "discardWorkout": {
      const p = item.payload as DiscardWorkoutPayload;
      const fd = new FormData();
      fd.append("workoutId", p.workout_id);
      await discardWorkoutAction(fd);
      return;
    }
    case "logCardio": {
      const p = item.payload as LogCardioPayload;
      const fd = new FormData();
      fd.append("id", p.id);
      fd.append("modality", p.modality);
      fd.append("started_at", p.started_at);
      fd.append("duration_sec", String(p.duration_sec));
      if (p.distance_m !== null) fd.append("distance_m", String(p.distance_m));
      await logCardioAction(fd);
      return;
    }
    default:
      throw new Error(`Unsupported op type: ${item.type satisfies never}`);
  }
};

// Re-entrancy guard: drainQueue may be triggered from multiple event
// sources (mount, online, visibility) near-simultaneously. We only want
// one drain in flight at a time.
let draining = false;

export const drainQueue = async (): Promise<{
  attempted: number;
  succeeded: number;
}> => {
  if (draining) return { attempted: 0, succeeded: 0 };
  draining = true;
  try {
    const items = await peekPending(20);
    const now = Date.now();
    let succeeded = 0;
    let attempted = 0;

    for (const item of items) {
      // Honour per-op backoff. The head op blocks the queue (FIFO,
      // fail-fast) so if it's still cooling off, abandon this drain
      // entirely — the next online/visibility event will re-check.
      if (inBackoff(item, now)) break;

      attempted++;
      try {
        await dispatchOp(item);
        await markSynced(item.id);
        succeeded++;
      } catch (err) {
        await markFailed(
          item.id,
          err instanceof Error ? err.message : String(err),
        );
        // Fail fast: if one op fails, pause drain. Likely the user is
        // offline or the server is returning errors; retrying the rest
        // immediately just burns battery. The next online/visibility
        // event will re-trigger, subject to backoff.
        break;
      }
    }

    return { attempted, succeeded };
  } finally {
    draining = false;
  }
};
