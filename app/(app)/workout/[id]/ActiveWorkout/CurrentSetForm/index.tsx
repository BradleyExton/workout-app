"use client";

import { useState, type FormEvent, type JSX } from "react";
import { Card } from "@/components/ui/Card";
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

export const CurrentSetForm = ({
  workoutExerciseId,
  initialSetNumber,
  defaults,
  formId,
}: CurrentSetFormProps): JSX.Element => {
  const [weight, setWeight] = useState(defaults.weight_kg);
  const [reps, setReps] = useState(defaults.reps);
  const [nextSetNumber, setNextSetNumber] = useState(initialSetNumber);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const weightValue = Number(weight);
    const repsValue = Number(reps);
    if (!Number.isFinite(weightValue) || weightValue < 0) return;
    if (!Number.isInteger(repsValue) || repsValue < 0) return;

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
  };

  return (
    <Card variant="lime" className={styles.card}>
      <form id={formId} onSubmit={onSubmit}>
        <div className={styles.header}>
          <span className={styles.setNumber}>{nextSetNumber}</span>
          <span className={styles.label}>{currentSetCopy.currentSetLabel}</span>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{currentSetCopy.weightLabel}</span>
            <input
              className={styles.input}
              name="weight_kg"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              required
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
            />
            <span className={styles.fieldUnit}>{currentSetCopy.weightUnit}</span>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{currentSetCopy.repsLabel}</span>
            <input
              className={styles.input}
              name="reps"
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              required
              value={reps}
              onChange={(event) => setReps(event.target.value)}
            />
            <span className={styles.fieldUnit}>{currentSetCopy.repsUnit}</span>
          </label>
        </div>
      </form>
    </Card>
  );
};
