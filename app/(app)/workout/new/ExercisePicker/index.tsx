"use client";

import { useMemo, useState, useTransition, type JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDb } from "@/lib/db/dexie";
import { newId } from "@/lib/db/ids";
import {
  drainQueue,
  enqueue,
  type AddExercisePayload,
  type CreateWorkoutPayload,
} from "@/lib/db/queue";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/db/types";
import { pickerCopy } from "./copy";
import * as styles from "./styles";

type PickerExercise = {
  id: string;
  name: string;
  primary_muscle: MuscleGroup;
};

type Filter = MuscleGroup | "All";

type ExercisePickerProps = {
  exercises: PickerExercise[];
  // Set when the user came from an active workout ("+ Add exercise") —
  // Back returns there instead of stranding them on home.
  fromWorkoutId: string | null;
};

// Finds the active workout in Dexie for this user. Dexie is the
// source of truth for ongoing workouts once 7c-extended is live —
// hydration from server for edge cases lands in 7d.
const findActiveWorkoutId = async (): Promise<string | null> => {
  const row = await getDb()
    .workouts.filter((w) => w.finished_at === null)
    .first();
  return row?.id ?? null;
};

const maxPositionInWorkout = async (workoutId: string): Promise<number> => {
  const rows = await getDb()
    .workout_exercises.where("workout_id")
    .equals(workoutId)
    .toArray();
  return rows.reduce((max, r) => Math.max(max, r.position), 0);
};

export const ExercisePicker = ({
  exercises,
  fromWorkoutId,
}: ExercisePickerProps): JSX.Element => {
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const backHref = fromWorkoutId ? `/workout/${fromWorkoutId}` : "/";

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return exercises.filter((exercise) => {
      const matchesFilter =
        filter === "All" || exercise.primary_muscle === filter;
      const matchesQuery =
        needle === "" || exercise.name.toLowerCase().includes(needle);
      return matchesFilter && matchesQuery;
    });
  }, [exercises, filter, query]);

  const filters: Filter[] = ["All", ...MUSCLE_GROUPS];

  const onPick = (exerciseId: string): void => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise || pickingId !== null) return;
    setPickingId(exerciseId);
    startTransition(async () => {
      const nowIso = new Date().toISOString();
      const db = getDb();

      // 1. Find or create the active workout.
      let workoutId = await findActiveWorkoutId();
      if (!workoutId) {
        workoutId = newId();
        await db.workouts.put({
          id: workoutId,
          user_id: "", // filled server-side; Dexie copy doesn't need it
          started_at: nowIso,
          finished_at: null,
          notes: null,
          created_at: nowIso,
        });
        await enqueue("createWorkout", {
          id: workoutId,
          started_at: nowIso,
        } satisfies CreateWorkoutPayload);
      }

      // 2. Re-picking an exercise that's already in this workout resumes
      // its existing block instead of appending a duplicate one.
      const existingWe = await db.workout_exercises
        .where("workout_id")
        .equals(workoutId)
        .filter((we) => we.exercise_id === exerciseId)
        .first();
      if (existingWe) {
        router.push(`/workout/${workoutId}?we=${existingWe.id}`);
        return;
      }

      // 3. Append the exercise. exercise_name + exercise_primary_muscle
      // are denormalized so the active-workout page can render this row
      // even when the server hasn't received the addExercise op yet.
      const weId = newId();
      const nextPosition = (await maxPositionInWorkout(workoutId)) + 1;
      await db.workout_exercises.put({
        id: weId,
        workout_id: workoutId,
        exercise_id: exerciseId,
        position: nextPosition,
        exercise_name: exercise.name,
        exercise_primary_muscle: exercise.primary_muscle,
      });
      await enqueue("addExercise", {
        id: weId,
        workout_id: workoutId,
        exercise_id: exerciseId,
        position: nextPosition,
      } satisfies AddExercisePayload);

      // Best-effort drain in the background. The /workout/[id] page now
      // hydrates from Dexie (phase 7d), so we don't need to wait for the
      // server before navigating.
      void drainQueue();
      router.push(`/workout/${workoutId}?we=${weId}`);
    });
  };

  return (
    <main className={styles.page}>
      <Link className={styles.back} href={backHref}>
        {pickerCopy.back}
      </Link>
      <h1 className={styles.title}>{pickerCopy.title}</h1>

      <div className={styles.searchWrap}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={styles.searchIcon}
          aria-hidden
        >
          <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2" />
          <path
            d="M15 15l5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <input
          className={styles.search}
          type="search"
          placeholder={pickerCopy.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className={styles.chipRow}>
        {filters.map((value) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`${styles.chipBase} ${active ? styles.chipActive : styles.chipIdle}`}
            >
              {value}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        filter !== "All" || query !== "" ? (
          <div className={styles.emptyBlock}>
            <p className={styles.emptyText}>{pickerCopy.emptyFiltered}</p>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                setFilter("All");
                setQuery("");
              }}
            >
              {pickerCopy.clearFilters}
            </button>
          </div>
        ) : (
          <p className={styles.empty}>{pickerCopy.empty}</p>
        )
      ) : (
        <div className={styles.list}>
          {visible.map((exercise) => {
            const picking = pickingId === exercise.id;
            return (
              <button
                key={exercise.id}
                type="button"
                onClick={() => onPick(exercise.id)}
                className={`${styles.rowButton} ${
                  pickingId !== null ? styles.rowDisabled : ""
                }`}
                disabled={pickingId !== null}
                aria-busy={picking}
              >
                <span className={styles.rowName}>{exercise.name}</span>
                <span className={styles.rowBadge}>
                  {picking ? pickerCopy.adding : exercise.primary_muscle}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
};
