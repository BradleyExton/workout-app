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
  // Highest set number this form instance has handed out.
  const [lastLogged, setLastLogged] = useState(0);
  const [error, setError] = useState<FieldError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Derived, not seeded-once state. The already-logged sets can arrive
  // *after* this form mounts: reopening a workout offline renders the
  // service worker's cached server snapshot first and only then hears
  // back from Dexie. A counter captured at mount stayed at 1 while the
  // session already had a set 1, so the next set was logged with a
  // duplicate set_number. Taking the max keeps it correct whichever
  // source is ahead — our own last write, or the session catching up.
  const nextSetNumber = Math.max(initialSetNumber, lastLogged + 1);

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

    setLastLogged(set_number);
    setSubmitting(false);
  };

  return (
    <div className={styles.card}>
      {/* method="dialog" is the no-JS guard, not a dialog thing: the submit
          button lives outside this form (it's in the fixed CTA strip) and a
          tap that lands before hydration would otherwise run the *native*
          submission — a GET reload of the workout screen with the set fields
          in the query string. With method="dialog" and no <dialog> ancestor
          the browser fires the submit event and then does nothing, so React's
          handler still runs once hydrated and an early tap is merely
          ignored. */}
      <form id={formId} method="dialog" onSubmit={onSubmit} noValidate>
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
              placeholder={currentSetCopy.weightPlaceholder}
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
              placeholder={currentSetCopy.repsPlaceholder}
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
