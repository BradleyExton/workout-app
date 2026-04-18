// Browser-only IndexedDB mirror of the hot-path Supabase schema.
//
// What lives here:
//   - workouts, workout_exercises, sets, cardio_sessions — the data a user
//     writes during a workout. Reads go here first in phase 7d; writes go
//     here first in phase 7b onwards.
//   - pending_ops — the write queue. Each entry describes a mutation that
//     still needs to reach Supabase. Drained opportunistically when online.
//
// What is NOT mirrored:
//   - exercises, muscles, exercise_muscles, achievements — mostly static,
//     can be cached separately if the picker ever needs to work offline.
//   - auth.users / session cookies — handled by Supabase SSR as before.
//
// Importing this module from a Server Component will try to touch
// IndexedDB during SSR and fail. Guard consumers with "use client".

import Dexie, { type Table } from "dexie";
import type { MuscleGroup } from "./types";

export type WorkoutRow = {
  id: string;
  user_id: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  created_at: string;
};

// `exercise_name` and `exercise_primary_muscle` are denormalized from the
// `exercises` table so the active-workout page can render Dexie-only rows
// without a server round-trip. They are NOT sent to the server during
// drain (queue.ts ignores them); the server joins to the canonical row.
export type WorkoutExerciseRow = {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
  exercise_name?: string;
  exercise_primary_muscle?: MuscleGroup;
};

export type SetLocalRow = {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  completed_at: string;
};

export type CardioSessionRow = {
  id: string;
  user_id: string;
  modality: "walk" | "run" | "treadmill";
  started_at: string;
  duration_sec: number;
  distance_m: number | null;
};

export type PendingOpType =
  | "createWorkout"
  | "addExercise"
  | "logSet"
  | "finishWorkout"
  | "discardWorkout"
  | "logCardio";

export type PendingOp = {
  id: string;
  type: PendingOpType;
  payload: unknown;
  created_at: string;
  synced_at: string | null;
  attempts: number;
  last_error: string | null;
};

class WorkoutDB extends Dexie {
  workouts!: Table<WorkoutRow, string>;
  workout_exercises!: Table<WorkoutExerciseRow, string>;
  sets!: Table<SetLocalRow, string>;
  cardio_sessions!: Table<CardioSessionRow, string>;
  pending_ops!: Table<PendingOp, string>;

  constructor() {
    super("workout_app");
    this.version(1).stores({
      workouts: "id, user_id, started_at, finished_at",
      workout_exercises: "id, workout_id, position, exercise_id",
      sets: "id, workout_exercise_id, [workout_exercise_id+set_number]",
      cardio_sessions: "id, user_id, started_at",
      // Composite index [synced_at+created_at] lets us pull the FIFO of
      // unsynced ops without a filter callback.
      pending_ops: "id, created_at, synced_at, [synced_at+created_at]",
    });
  }
}

let instance: WorkoutDB | null = null;

export const getDb = (): WorkoutDB => {
  if (typeof window === "undefined") {
    throw new Error("Dexie is browser-only — import from a client component");
  }
  if (!instance) instance = new WorkoutDB();
  return instance;
};
