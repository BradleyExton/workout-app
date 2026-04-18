"use client";

import { useLiveQuery } from "dexie-react-hooks";
import type { JSX } from "react";
import { Card } from "@/components/ui/Card";
import { getDb } from "@/lib/db/dexie";
import type { LogSetPayload } from "@/lib/db/queue";
import { formatWeight } from "@/lib/format/weight";
import { setListCopy } from "./copy";
import * as styles from "./styles";

type ServerSetRow = {
  id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
};

type SetListProps = {
  workoutExerciseId: string;
  serverSets: ServerSetRow[];
};

type MergedSet = ServerSetRow & { pending: boolean };

export const SetList = ({
  workoutExerciseId,
  serverSets,
}: SetListProps): JSX.Element => {
  const dexieSets = useLiveQuery(
    () =>
      getDb()
        .sets.where("workout_exercise_id")
        .equals(workoutExerciseId)
        .toArray(),
    [workoutExerciseId],
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
        ops
          .map((op) => op.payload as LogSetPayload)
          .filter((p) => p.workoutExerciseId === workoutExerciseId)
          .map((p) => p.id),
      );
    },
    [workoutExerciseId],
    new Set<string>(),
  );

  // Merge server + Dexie, dedupe by id. Dexie wins on conflict so that a
  // freshly-logged row doesn't disappear when the page later revalidates.
  const byId = new Map<string, MergedSet>();
  for (const s of serverSets) {
    byId.set(s.id, { ...s, pending: pendingSetIds.has(s.id) });
  }
  for (const s of dexieSets) {
    byId.set(s.id, {
      id: s.id,
      set_number: s.set_number,
      weight_kg: s.weight_kg,
      reps: s.reps,
      pending: pendingSetIds.has(s.id),
    });
  }

  const merged = [...byId.values()].sort(
    (a, b) => a.set_number - b.set_number,
  );

  return (
    <div className={styles.list}>
      {merged.map((set) => (
        <Card key={set.id} size="sm" className={styles.row}>
          <span className={styles.number}>{set.set_number}</span>
          <span className={styles.value}>
            {formatWeight(set.weight_kg)} × {set.reps}
          </span>
          <span className={set.pending ? styles.pending : styles.check}>
            {set.pending ? setListCopy.pending : setListCopy.synced}
          </span>
        </Card>
      ))}
    </div>
  );
};
