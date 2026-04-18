"use client";

import { useEffect, useMemo, type JSX } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/dexie";
import type { LogSetPayload } from "@/lib/db/queue";
import type { MuscleGroup } from "@/lib/db/types";
import { ActiveWorkout } from "..";
import { hydratorCopy } from "./copy";
import * as styles from "./styles";

type ServerExercise = {
  id: string;
  name: string;
  primary_muscle: MuscleGroup;
};

type ServerWorkoutExercise = {
  id: string;
  position: number;
  exercise_id: string;
  exercise: ServerExercise | null;
};

type ServerSet = {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
};

type ServerLastSession = {
  exerciseId: string;
  finishedAt: string;
  sets: { set_number: number; weight_kg: number; reps: number }[];
};

export type ServerSnapshot = {
  workout: {
    id: string;
    started_at: string;
    finished_at: string | null;
  } | null;
  workoutExercises: ServerWorkoutExercise[];
  sets: ServerSet[];
  lastSession: ServerLastSession | null;
};

type HydratorProps = {
  workoutId: string;
  server: ServerSnapshot;
};

type MergedWE = {
  id: string;
  position: number;
  exercise: ServerExercise | null;
};

type MergedSet = ServerSet & { pending: boolean };

export const Hydrator = ({ workoutId, server }: HydratorProps): JSX.Element => {
  const router = useRouter();

  // One-shot: seed Dexie from the server snapshot so a fresh device picks
  // up the active workout. Idempotent — subsequent live-queries keep
  // Dexie as the source of truth.
  useEffect(() => {
    const seed = async (): Promise<void> => {
      const db = getDb();
      if (server.workout) await db.workouts.put({
        id: server.workout.id,
        user_id: "",
        started_at: server.workout.started_at,
        finished_at: server.workout.finished_at,
        notes: null,
        created_at: server.workout.started_at,
      });
      if (server.workoutExercises.length > 0) {
        await db.workout_exercises.bulkPut(
          server.workoutExercises.map((we) => ({
            id: we.id,
            workout_id: workoutId,
            exercise_id: we.exercise_id,
            position: we.position,
            exercise_name: we.exercise?.name,
            exercise_primary_muscle: we.exercise?.primary_muscle,
          })),
        );
      }
      if (server.sets.length > 0) {
        await db.sets.bulkPut(
          server.sets.map((s) => ({
            id: s.id,
            workout_exercise_id: s.workout_exercise_id,
            set_number: s.set_number,
            weight_kg: s.weight_kg,
            reps: s.reps,
            completed_at: server.workout?.started_at ?? new Date().toISOString(),
          })),
        );
      }
    };
    void seed();
  }, [workoutId, server]);

  const dexieWorkout = useLiveQuery(
    () => getDb().workouts.get(workoutId),
    [workoutId],
    undefined,
  );

  const dexieExercises = useLiveQuery(
    () =>
      getDb()
        .workout_exercises.where("workout_id")
        .equals(workoutId)
        .toArray(),
    [workoutId],
    [],
  );

  const dexieSets = useLiveQuery(
    async () => {
      const weIds = (
        await getDb()
          .workout_exercises.where("workout_id")
          .equals(workoutId)
          .toArray()
      ).map((we) => we.id);
      if (weIds.length === 0) return [];
      return getDb().sets.where("workout_exercise_id").anyOf(weIds).toArray();
    },
    [workoutId],
    [],
  );

  const pendingSetIds = useLiveQuery(
    async () => {
      const ops = await getDb()
        .pending_ops.filter(
          (op) => op.synced_at === null && op.type === "logSet",
        )
        .toArray();
      return new Set(
        ops.map((op) => (op.payload as LogSetPayload).id),
      );
    },
    [],
    new Set<string>(),
  );

  const merged = useMemo(() => {
    const workout =
      dexieWorkout
        ? {
            id: dexieWorkout.id,
            started_at: dexieWorkout.started_at,
            finished_at: dexieWorkout.finished_at,
          }
        : server.workout;

    const weById = new Map<string, MergedWE>();
    for (const we of server.workoutExercises) {
      weById.set(we.id, {
        id: we.id,
        position: we.position,
        exercise: we.exercise,
      });
    }
    for (const we of dexieExercises) {
      const existing = weById.get(we.id);
      const exercise: ServerExercise | null = existing?.exercise
        ? existing.exercise
        : we.exercise_name && we.exercise_primary_muscle
          ? {
              id: we.exercise_id,
              name: we.exercise_name,
              primary_muscle: we.exercise_primary_muscle,
            }
          : null;
      weById.set(we.id, {
        id: we.id,
        position: we.position,
        exercise,
      });
    }
    const workoutExercises = [...weById.values()].sort(
      (a, b) => a.position - b.position,
    );

    const setById = new Map<string, MergedSet>();
    for (const s of server.sets) {
      setById.set(s.id, { ...s, pending: pendingSetIds.has(s.id) });
    }
    for (const s of dexieSets) {
      setById.set(s.id, {
        id: s.id,
        workout_exercise_id: s.workout_exercise_id,
        set_number: s.set_number,
        weight_kg: s.weight_kg,
        reps: s.reps,
        pending: pendingSetIds.has(s.id),
      });
    }
    const sets = [...setById.values()];

    return { workout, workoutExercises, sets };
  }, [server, dexieWorkout, dexieExercises, dexieSets, pendingSetIds]);

  // Finished workouts shouldn't render the active page. Server-side this
  // would have been a redirect; here we mirror it once Dexie reports
  // finished_at (e.g., user finished offline, drain hasn't run yet).
  useEffect(() => {
    if (merged.workout?.finished_at) router.replace("/");
  }, [merged.workout?.finished_at, router]);

  if (!merged.workout) {
    return (
      <main className={styles.empty}>
        <p>{hydratorCopy.notFound}</p>
      </main>
    );
  }

  if (merged.workout.finished_at) {
    return <main className={styles.empty} />;
  }

  const setsByExercise = new Map<string, MergedSet[]>();
  for (const set of merged.sets) {
    const arr = setsByExercise.get(set.workout_exercise_id) ?? [];
    arr.push(set);
    setsByExercise.set(set.workout_exercise_id, arr);
  }
  for (const arr of setsByExercise.values()) {
    arr.sort((a, b) => a.set_number - b.set_number);
  }

  const current = merged.workoutExercises.at(-1) ?? null;
  const currentSets = current ? (setsByExercise.get(current.id) ?? []) : [];

  const lastSession =
    server.lastSession && current?.exercise?.id === server.lastSession.exerciseId
      ? {
          finishedAt: server.lastSession.finishedAt,
          sets: server.lastSession.sets,
        }
      : null;

  const todayItems = merged.workoutExercises
    .filter((we) => we.id !== current?.id && we.exercise !== null)
    .map((we) => {
      const sets = setsByExercise.get(we.id) ?? [];
      return {
        id: we.id,
        name: we.exercise?.name ?? "",
        setCount: sets.length,
        lastWeight: sets.at(-1)?.weight_kg ?? null,
      };
    });

  const totalSets = merged.sets.length;
  const totalVolume = merged.sets.reduce(
    (sum, s) => sum + s.weight_kg * s.reps,
    0,
  );

  return (
    <ActiveWorkout
      workout={merged.workout}
      current={
        current
          ? {
              id: current.id,
              position: current.position,
              exercise: current.exercise,
            }
          : null
      }
      currentSets={currentSets}
      lastSession={lastSession}
      todayItems={todayItems}
      stats={{
        sets: totalSets,
        exercises: merged.workoutExercises.length,
        volume: totalVolume,
      }}
    />
  );
};
