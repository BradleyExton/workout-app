"use client";

import { useState, type FormEvent, type JSX } from "react";
import { getDb } from "@/lib/db/dexie";
import { newId } from "@/lib/db/ids";
import { drainQueue, enqueue, type LogSetPayload } from "@/lib/db/queue";
import { currentSetCopy } from "./copy";
import * as styles from "./styles";

type Defaults = { weight_kg: string; reps: string };

type CurrentSetFormProps = {
  workoutExerciseId: string;
  initialSetNumber: number;
  defaults: Defaults;
  formId: string;
};

const MAX_WEIGHT_KG = 500;
const MAX_REPS = 100;

type FieldError = { field: "weight" | "reps"; message: string };

export const CurrentSetForm = ({
  workoutExerciseId,
  initialSetNumber,
  defaults,
  formId,
}: CurrentSetFormProps): JSX.Element => {
  const [weight, setWeight] = useState(defaults.weight_kg);
  const [reps, setReps] = useState(defaults.reps);
  const [nextSetNumber, setNextSetNumber] = useState(initialSetNumber);
  const [error, setError] = useState<FieldError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (submitting) return;

    const weightValue = Number(weight);
    const repsValue = Number(reps);
    if (weight.trim() === "" || !Number.isFinite(weightValue) || weightValue < 0) {
      setError({ field: "weight", message: currentSetCopy.errorWeight });
      return;
    }
    if (weightValue > MAX_WEIGHT_KG) {
      setError({ field: "weight", message: currentSetCopy.errorWeightMax });
      return;
    }
    if (
      reps.trim() === "" ||
      !Number.isInteger(repsValue) ||
      repsValue < 1
    ) {
      setError({ field: "reps", message: currentSetCopy.errorReps });
      return;
    }
    if (repsValue > MAX_REPS) {
      setError({ field: "reps", message: currentSetCopy.errorRepsMax });
      return;
    }
    setError(null);
    setSubmitting(true);

    const id = newId();
    const set_number = nextSetNumber;
    const completed_at = new Date().toISOString();

    // Write to Dexie first — SetList's useLiveQuery picks this up and
    // renders the new row before the server round-trip completes.
    await getDb().sets.add({
      id,
      workout_exercise_id: workoutExerciseId,
      set_number,
      weight_kg: weightValue,
      reps: repsValue,
      completed_at,
    });

    const payload: LogSetPayload = {
      id,
      workoutExerciseId,
      set_number,
      weight_kg: weightValue,
      reps: repsValue,
    };
    await enqueue("logSet", payload);

    // Best-effort immediate drain. If offline, markFailed fires but the
    // row stays pending — next online/visibility event retries.
    void drainQueue();

    setNextSetNumber((n) => n + 1);
    setSubmitting(false);
  };

  return (
    <div className={styles.card}>
      <form id={formId} onSubmit={onSubmit} noValidate>
        <div className={styles.header}>
          <span className={styles.setNumber}>{nextSetNumber}</span>
          <span className={styles.label}>{currentSetCopy.currentSetLabel}</span>
        </div>

        <div className={styles.grid}>
          <label
            className={`${styles.field} ${error?.field === "weight" ? styles.fieldError : ""}`}
          >
            <span className={styles.fieldLabel}>{currentSetCopy.weightLabel}</span>
            <input
              className={styles.input}
              name="weight_kg"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              aria-invalid={error?.field === "weight"}
              value={weight}
              onChange={(event) => {
                setWeight(event.target.value);
                if (error?.field === "weight") setError(null);
              }}
            />
            <span className={styles.fieldUnit}>{currentSetCopy.weightUnit}</span>
          </label>

          <label
            className={`${styles.field} ${error?.field === "reps" ? styles.fieldError : ""}`}
          >
            <span className={styles.fieldLabel}>{currentSetCopy.repsLabel}</span>
            <input
              className={styles.input}
              name="reps"
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              aria-invalid={error?.field === "reps"}
              value={reps}
              onChange={(event) => {
                setReps(event.target.value);
                if (error?.field === "reps") setError(null);
              }}
            />
            <span className={styles.fieldUnit}>{currentSetCopy.repsUnit}</span>
          </label>
        </div>

        {error && (
          <p role="alert" className={styles.errorText}>
            {error.message}
          </p>
        )}
      </form>
    </div>
  );
};
