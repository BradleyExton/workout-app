"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/dexie";
import type {
  DeleteSetPayload,
  LogSetPayload,
  UpdateSetPayload,
} from "@/lib/db/queue";
import type { MuscleGroup } from "@/lib/db/types";
import { computePrFlags, type PrType, type SetForPr } from "@/lib/domain/pr";
import type { WorkoutUnlocks } from "../../actions";
import { ActiveWorkout } from "..";
import type { FinishFlow } from "../FinishControls";
import { WorkoutComplete } from "../WorkoutComplete";
import { hydratorCopy } from "./copy";
import * as styles from "./styles";

// idle → finishing (modal saving; suppresses the finished-redirect) →
// complete (celebration screen replaces the active page).
type FinishState =
  | { phase: "idle" }
  | { phase: "finishing" }
  | { phase: "complete"; unlocks: WorkoutUnlocks; durationMs: number };

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

type ServerPr = {
  exercise_id: string;
  pr_type: PrType;
  value: number;
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
  prs: ServerPr[];
};

type HydratorProps = {
  workoutId: string;
  server: ServerSnapshot;
  // Deep-linked current exercise (?we=): the picker passes it when the
  // user re-picks an exercise that's already in this workout.
  initialCurrentWeId?: string | null;
};

type MergedWE = {
  id: string;
  position: number;
  exercise: ServerExercise | null;
};

type MergedSet = ServerSet & { pending: boolean };

export const Hydrator = ({
  workoutId,
  server,
  initialCurrentWeId = null,
}: HydratorProps): JSX.Element => {
  const router = useRouter();
  const [finishState, setFinishState] = useState<FinishState>({
    phase: "idle",
  });
  // Which exercise the set form targets. Defaults to the last-added one;
  // Today rows and the picker's ?we= deep link can retarget it.
  const [selectedWeId, setSelectedWeId] = useState<string | null>(
    initialCurrentWeId,
  );
  const finishFlow = useMemo<FinishFlow>(
    () => ({
      onStart: () => setFinishState({ phase: "finishing" }),
      onReset: () =>
        setFinishState((s) => (s.phase === "complete" ? s : { phase: "idle" })),
      onComplete: ({ unlocks, durationMs }) =>
        setFinishState({ phase: "complete", unlocks, durationMs }),
    }),
    [],
  );

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
          (op) =>
            op.synced_at === null &&
            (op.type === "logSet" || op.type === "updateSet"),
        )
        .toArray();
      return new Set(
        ops.map((op) => (op.payload as LogSetPayload | UpdateSetPayload).id),
      );
    },
    [],
    new Set<string>(),
  );

  // Tombstones: a set deleted locally must not be resurrected by the
  // (stale) server snapshot. Includes synced ops — they linger for 24h,
  // long past the next server render.
  const deletedSetIds = useLiveQuery(
    async () => {
      const ops = await getDb()
        .pending_ops.filter((op) => op.type === "deleteSet")
        .toArray();
      return new Set(ops.map((op) => (op.payload as DeleteSetPayload).id));
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
    const sets = [...setById.values()].filter((s) => !deletedSetIds.has(s.id));

    return { workout, workoutExercises, sets };
  }, [server, dexieWorkout, dexieExercises, dexieSets, pendingSetIds, deletedSetIds]);

  // Finished workouts shouldn't render the active page. Server-side this
  // would have been a redirect; here we mirror it once Dexie reports
  // finished_at — unless the finish is happening through THIS page's
  // finish flow, which owns the navigation home.
  const staleFinished =
    finishState.phase === "idle" && merged.workout?.finished_at != null;
  useEffect(() => {
    if (staleFinished) router.replace("/");
  }, [staleFinished, router]);

  if (!merged.workout) {
    return (
      <main className={styles.notFoundWrap}>
        <h1 className={styles.notFoundTitle}>{hydratorCopy.notFound}</h1>
        <p className={styles.notFoundBody}>{hydratorCopy.notFoundBody}</p>
        <Link href="/" className={styles.notFoundCta}>
          {hydratorCopy.homeCta}
        </Link>
      </main>
    );
  }

  if (staleFinished) {
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

  const current =
    (selectedWeId
      ? merged.workoutExercises.find((we) => we.id === selectedWeId)
      : null) ??
    merged.workoutExercises.at(-1) ??
    null;
  const currentSets = current ? (setsByExercise.get(current.id) ?? []) : [];

  const lastSession =
    server.lastSession && current?.exercise?.id === server.lastSession.exerciseId
      ? {
          finishedAt: server.lastSession.finishedAt,
          sets: server.lastSession.sets,
        }
      : null;

  const currentExerciseId = current?.exercise?.id ?? null;
  const currentExercisePrs = currentExerciseId
    ? server.prs.filter((pr) => pr.exercise_id === currentExerciseId)
    : [];

  const currentExercisePrPills = {
    oneRm: currentExercisePrs.find((p) => p.pr_type === "1rm")?.value ?? null,
    volume: currentExercisePrs.find((p) => p.pr_type === "volume")?.value ?? null,
    reps: currentExercisePrs.find((p) => p.pr_type === "reps")?.value ?? null,
  };

  const orderedCurrentSets: SetForPr[] = currentExerciseId
    ? currentSets
        .filter((s) => !s.pending)
        .map((s) => ({
          id: s.id,
          exercise_id: currentExerciseId,
          weight_kg: s.weight_kg,
          reps: s.reps,
          completed_at: "",
        }))
    : [];

  const prFlagMap = computePrFlags(
    currentExercisePrs.map((p) => ({
      exercise_id: p.exercise_id,
      pr_type: p.pr_type,
      value: p.value,
    })),
    orderedCurrentSets,
  );
  const setPrFlags: Record<string, { oneRm: boolean; volume: boolean; reps: boolean }> = {};
  for (const [setId, flags] of prFlagMap) setPrFlags[setId] = flags;

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

  if (finishState.phase === "complete") {
    return (
      <WorkoutComplete
        setsCount={totalSets}
        volume={totalVolume}
        durationMs={finishState.durationMs}
        unlocks={finishState.unlocks}
        onContinue={() => router.push("/")}
      />
    );
  }

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
      prs={currentExercisePrPills}
      setPrFlags={setPrFlags}
      todayItems={todayItems}
      stats={{
        sets: totalSets,
        exercises: merged.workoutExercises.length,
        volume: totalVolume,
      }}
      finishFlow={finishFlow}
      onSelectExercise={setSelectedWeId}
    />
  );
};
