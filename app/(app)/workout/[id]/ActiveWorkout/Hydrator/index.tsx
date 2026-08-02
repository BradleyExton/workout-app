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
import { isWorkoutClosedLocally } from "@/lib/db/tombstones";
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
  completed_at: string;
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
  //
  // Fill-only, never overwrite. This snapshot is not necessarily fresh:
  // offline, the service worker serves a document it cached earlier, so
  // `server` can be minutes or hours behind the sets sitting in Dexie
  // waiting to drain. Writing it over local rows would silently revert
  // the user's own work. The single exception is a finish, which is
  // monotonic and may have happened on another device.
  //
  // Fill-only is not enough on its own for a discard: that path deletes
  // the Dexie rows outright, so "fill what's missing" happily rebuilds
  // the entire workout from a snapshot that predates the discard. The
  // queue tombstone is what tells us the absence was deliberate.
  useEffect(() => {
    const seed = async (): Promise<void> => {
      const db = getDb();

      if (await isWorkoutClosedLocally(workoutId)) return;

      if (server.workout) {
        const local = await db.workouts.get(server.workout.id);
        await db.workouts.put({
          id: server.workout.id,
          user_id: local?.user_id ?? "",
          started_at: local?.started_at ?? server.workout.started_at,
          finished_at: local?.finished_at ?? server.workout.finished_at,
          notes: local?.notes ?? null,
          created_at: local?.created_at ?? server.workout.started_at,
        });
      }

      if (server.workoutExercises.length > 0) {
        const known = await db.workout_exercises.bulkGet(
          server.workoutExercises.map((we) => we.id),
        );
        const present = new Set(
          known.filter((row) => row !== undefined).map((row) => row.id),
        );
        const missing = server.workoutExercises
          .filter((we) => !present.has(we.id))
          .map((we) => ({
            id: we.id,
            workout_id: workoutId,
            exercise_id: we.exercise_id,
            position: we.position,
            exercise_name: we.exercise?.name,
            exercise_primary_muscle: we.exercise?.primary_muscle,
          }));
        if (missing.length > 0) await db.workout_exercises.bulkAdd(missing);
      }

      if (server.sets.length > 0) {
        const known = await db.sets.bulkGet(server.sets.map((s) => s.id));
        const present = new Set(
          known.filter((row) => row !== undefined).map((row) => row.id),
        );
        const missing = server.sets
          .filter((s) => !present.has(s.id))
          .map((s) => ({
            id: s.id,
            workout_exercise_id: s.workout_exercise_id,
            set_number: s.set_number,
            weight_kg: s.weight_kg,
            reps: s.reps,
            completed_at: s.completed_at,
          }));
        if (missing.length > 0) await db.sets.bulkAdd(missing);
      }
    };
    void seed();
  }, [workoutId, server]);

  // `undefined` matters: it means "Dexie hasn't answered yet", as opposed
  // to a resolved `row: null` meaning "no such workout here". Without the
  // distinction the first paint of an offline reopen — server snapshot
  // empty, Dexie still opening — flashes "Workout not found" at someone
  // whose sets are sitting safely in IndexedDB.
  //
  // The row and the tombstone are read together so the two never arrive
  // out of step and briefly render a discarded workout as live.
  const localWorkout = useLiveQuery(
    async () => ({
      row: (await getDb().workouts.get(workoutId)) ?? null,
      closed: await isWorkoutClosedLocally(workoutId),
    }),
    [workoutId],
    undefined,
  );
  const dexieWorkout = localWorkout?.row ?? null;
  const locallyClosed = localWorkout?.closed ?? false;
  const dexiePending = localWorkout === undefined;

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
    // A workout discarded locally has no Dexie row by design. Falling
    // back to the server snapshot then re-renders the session the user
    // just deleted, so the tombstone wins over the server.
    const workout = dexieWorkout
      ? {
          id: dexieWorkout.id,
          started_at: dexieWorkout.started_at,
          finished_at: dexieWorkout.finished_at,
        }
      : locallyClosed
        ? null
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
        completed_at: s.completed_at,
        pending: pendingSetIds.has(s.id),
      });
    }
    const sets = [...setById.values()].filter((s) => !deletedSetIds.has(s.id));

    // Newest set in the whole session, across every exercise — the one
    // signal the idle logic treats as proof that training is happening.
    // Null until something is logged; the caller falls back to the start.
    let lastSetAtMs: number | null = null;
    for (const set of sets) {
      const ms = new Date(set.completed_at).getTime();
      if (!Number.isFinite(ms)) continue;
      if (lastSetAtMs === null || ms > lastSetAtMs) lastSetAtMs = ms;
    }

    return { workout, workoutExercises, sets, lastSetAtMs };
  }, [
    server,
    dexieWorkout,
    locallyClosed,
    dexieExercises,
    dexieSets,
    pendingSetIds,
    deletedSetIds,
  ]);

  // Finished workouts shouldn't render the active page. Server-side this
  // would have been a redirect; here we mirror it once Dexie reports
  // finished_at — unless the finish is happening through THIS page's
  // finish flow, which owns the navigation home.
  const staleFinished =
    finishState.phase === "idle" && merged.workout?.finished_at != null;
  // Discarded out from under us — by the idle guard's auto-close, or on
  // another tab. The tombstone says the absence is deliberate, so this is
  // not the "no such workout" case below: bouncing home is right, and
  // accusing the user of following a dead link is not.
  const staleDiscarded =
    finishState.phase === "idle" && locallyClosed && dexieWorkout === null;
  useEffect(() => {
    if (staleFinished || staleDiscarded) router.replace("/");
  }, [staleFinished, staleDiscarded, router]);

  // Nothing from the server and Dexie still opening: wait rather than
  // accuse. This is the normal first frame of an offline reopen.
  if (!merged.workout && dexiePending) {
    return <main className={styles.empty} />;
  }

  // Deliberately closed, not missing: hold a blank frame for the
  // redirect above rather than flashing an accusation.
  if (staleDiscarded) {
    return <main className={styles.empty} />;
  }

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
      lastSetAtMs={merged.lastSetAtMs}
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
