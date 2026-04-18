// Write-queue primitives + drain path.
//
// Enqueue: producers (phase 7c+) call enqueue() after mirror-writing to
// Dexie so the UI can reflect the change before the server round-trip.
//
// Drain: runs client-side (Next.js server actions imported here get
// transparently POSTed to the server when called from client code).
// Triggered by QueueSyncer on mount + online events. Each op dispatches to
// its corresponding server action; on success the row is marked synced,
// on failure attempts is bumped and last_error is recorded.
//
// Currently dispatches: logSet. Others added as producers come online.

import { logSet as logSetAction } from "@/app/(app)/workout/[id]/actions";
import { getDb, type PendingOp, type PendingOpType } from "./dexie";
import { newId } from "./ids";

export type QueueItem<T = unknown> = {
  id: string;
  type: PendingOpType;
  payload: T;
  created_at: string;
  attempts: number;
};

export type LogSetPayload = {
  id: string;
  workoutExerciseId: string;
  set_number: number;
  weight_kg: number;
  reps: number;
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
  });
};

const dispatchOp = async (item: QueueItem): Promise<void> => {
  switch (item.type) {
    case "logSet": {
      const p = item.payload as LogSetPayload;
      const fd = new FormData();
      fd.append("id", p.id);
      fd.append("workoutExerciseId", p.workoutExerciseId);
      fd.append("set_number", String(p.set_number));
      fd.append("weight_kg", String(p.weight_kg));
      fd.append("reps", String(p.reps));
      await logSetAction(fd);
      return;
    }
    default:
      // 7c wires up addExercise / finishWorkout / discardWorkout / logCardio.
      // Unknown op: leave in queue for a future version to handle.
      throw new Error(`Unsupported op type: ${item.type}`);
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
    let succeeded = 0;

    for (const item of items) {
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
        // event will re-trigger.
        break;
      }
    }

    return { attempted: items.length, succeeded };
  } finally {
    draining = false;
  }
};
