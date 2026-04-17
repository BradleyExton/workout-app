"use client";

import { useState, type JSX } from "react";
import { Card } from "@/components/ui/Card";
import { logSet } from "../../actions";
import { currentSetCopy } from "./copy";
import * as styles from "./styles";

type Defaults = { weight_kg: string; reps: string };

type CurrentSetFormProps = {
  workoutExerciseId: string;
  setNumber: number;
  defaults: Defaults;
  formId: string;
};

export const CurrentSetForm = ({
  workoutExerciseId,
  setNumber,
  defaults,
  formId,
}: CurrentSetFormProps): JSX.Element => {
  const [weight, setWeight] = useState(defaults.weight_kg);
  const [reps, setReps] = useState(defaults.reps);

  return (
    <Card variant="lime" className={styles.card}>
      <form id={formId} action={logSet}>
        <input
          type="hidden"
          name="workoutExerciseId"
          value={workoutExerciseId}
        />

        <div className={styles.header}>
          <span className={styles.setNumber}>{setNumber}</span>
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
