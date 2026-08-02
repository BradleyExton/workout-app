"use client";

import { useState, type JSX } from "react";
import { Card } from "@/components/ui/Card";
import { getDb } from "@/lib/db/dexie";
import {
  drainQueue,
  enqueue,
  type DeleteSetPayload,
  type UpdateSetPayload,
} from "@/lib/db/queue";
import { formatWeight } from "@/lib/format/weight";
import { setListCopy } from "./copy";
import * as styles from "./styles";

type SetRow = {
  id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  pending: boolean;
};

type SetPrFlags = { oneRm: boolean; volume: boolean; reps: boolean };

type SetListProps = {
  sets: SetRow[];
  prFlags: Record<string, SetPrFlags>;
};

export const MAX_WEIGHT_KG = 500;
export const MAX_REPS = 100;

export const SetList = ({ sets, prFlags }: SetListProps): JSX.Element => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = (set: SetRow): void => {
    if (busy) return;
    if (openId === set.id) {
      setOpenId(null);
      return;
    }
    setOpenId(set.id);
    setWeight(formatWeight(set.weight_kg));
    setReps(String(set.reps));
    setError(null);
    setConfirmingDelete(false);
  };

  const onSave = async (set: SetRow): Promise<void> => {
    if (busy) return;
    const weightValue = Number(weight);
    const repsValue = Number(reps);
    if (
      weight.trim() === "" ||
      !Number.isFinite(weightValue) ||
      weightValue < 0
    ) {
      setError(setListCopy.errorWeight);
      return;
    }
    if (weightValue > MAX_WEIGHT_KG) {
      setError(setListCopy.errorWeightMax);
      return;
    }
    if (reps.trim() === "" || !Number.isInteger(repsValue) || repsValue < 1) {
      setError(setListCopy.errorReps);
      return;
    }
    if (repsValue > MAX_REPS) {
      setError(setListCopy.errorRepsMax);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await getDb().sets.update(set.id, {
        weight_kg: weightValue,
        reps: repsValue,
      });
      await enqueue("updateSet", {
        id: set.id,
        weight_kg: weightValue,
        reps: repsValue,
      } satisfies UpdateSetPayload);
      void drainQueue();
      setOpenId(null);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (set: SetRow): Promise<void> => {
    if (busy) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setBusy(true);
    try {
      await getDb().sets.delete(set.id);
      await enqueue("deleteSet", { id: set.id } satisfies DeleteSetPayload);
      void drainQueue();
      setOpenId(null);
    } finally {
      setBusy(false);
    }
  };

  const anyPending = sets.some((set) => set.pending);

  return (
    <div className={styles.list}>
      {sets.map((set) => {
        const flags = prFlags[set.id];
        const hasPr = flags && (flags.oneRm || flags.volume || flags.reps);
        const open = openId === set.id;
        return (
          <Card key={set.id} size="sm" className={styles.rowCard}>
            <button
              type="button"
              className={styles.rowButton}
              onClick={() => toggle(set)}
              aria-expanded={open}
              aria-label={setListCopy.rowLabel(
                set.set_number,
                formatWeight(set.weight_kg),
                set.reps,
              )}
            >
              <span className={styles.number}>{set.set_number}</span>
              <span className={styles.value}>
                {formatWeight(set.weight_kg)} × {set.reps}
              </span>
              {hasPr && (
                <span className={styles.prBadge}>{setListCopy.newPr}</span>
              )}
              <span
                className={set.pending ? styles.pending : styles.check}
                role="status"
                aria-label={
                  set.pending ? setListCopy.pendingLabel : setListCopy.syncedLabel
                }
              >
                {set.pending ? setListCopy.pending : setListCopy.synced}
              </span>
            </button>

            {open && (
              <div className={styles.editWrap}>
                <div className={styles.editGrid}>
                  <label className={styles.editField}>
                    <span className={styles.editLabel}>
                      {setListCopy.weightLabel}
                    </span>
                    <input
                      className={styles.editInput}
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={weight}
                      onChange={(event) => {
                        setWeight(event.target.value);
                        setError(null);
                      }}
                    />
                  </label>
                  <label className={styles.editField}>
                    <span className={styles.editLabel}>
                      {setListCopy.repsLabel}
                    </span>
                    <input
                      className={styles.editInput}
                      type="number"
                      inputMode="numeric"
                      step="1"
                      value={reps}
                      onChange={(event) => {
                        setReps(event.target.value);
                        setError(null);
                      }}
                    />
                  </label>
                </div>

                {error && (
                  <p role="alert" className={styles.editError}>
                    {error}
                  </p>
                )}

                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={styles.saveBtn}
                    onClick={() => void onSave(set)}
                    disabled={busy}
                  >
                    {setListCopy.save}
                  </button>
                  <button
                    type="button"
                    className={
                      confirmingDelete ? styles.deleteConfirmBtn : styles.deleteBtn
                    }
                    onClick={() => void onDelete(set)}
                    disabled={busy}
                  >
                    {confirmingDelete ? setListCopy.deleteConfirm : setListCopy.delete}
                  </button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
      {anyPending && <p className={styles.legend}>{setListCopy.pendingLegend}</p>}
    </div>
  );
};
