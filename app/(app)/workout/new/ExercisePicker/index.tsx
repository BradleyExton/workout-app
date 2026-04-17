"use client";

import { useMemo, useState, type JSX } from "react";
import Link from "next/link";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/db/types";
import { addExerciseToWorkout } from "../actions";
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
};

export const ExercisePicker = ({
  exercises,
}: ExercisePickerProps): JSX.Element => {
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");

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

  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/">
        {pickerCopy.back}
      </Link>
      <h1 className={styles.title}>{pickerCopy.title}</h1>

      <input
        className={styles.search}
        type="search"
        placeholder={pickerCopy.searchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

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
        <p className={styles.empty}>{pickerCopy.empty}</p>
      ) : (
        <div className={styles.list}>
          {visible.map((exercise) => (
            <form key={exercise.id} action={addExerciseToWorkout}>
              <input type="hidden" name="exerciseId" value={exercise.id} />
              <button type="submit" className={styles.rowButton}>
                <span className={styles.rowName}>{exercise.name}</span>
                <span className={styles.rowBadge}>{exercise.primary_muscle}</span>
              </button>
            </form>
          ))}
        </div>
      )}
    </main>
  );
};
