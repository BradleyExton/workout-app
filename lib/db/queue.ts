// Write-queue skeleton for the offline flow. Behavior (actual Supabase
// dispatch) lands in phase 7b. For now we expose the enqueue + peek + mark
// primitives and a no-op drain so the shape is stable.

import { getDb, type PendingOp, type PendingOpType } from "./dexie";
import { newId } from "./ids";

export type QueueItem<T = unknown> = {
  id: string;
  type: PendingOpType;
  payload: T;
  created_at: string;
  attempts: number;
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

// Placeholder — phase 7b wires this up to actually dispatch ops to the
// Supabase server actions. For now it's a no-op so consumers can call it
// without breaking.
export const drainQueue = async (): Promise<{
  attempted: number;
  succeeded: number;
}> => {
  return { attempted: 0, succeeded: 0 };
};
