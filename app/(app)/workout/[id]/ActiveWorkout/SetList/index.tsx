import type { JSX } from "react";
import { Card } from "@/components/ui/Card";
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

export const SetList = ({ sets, prFlags }: SetListProps): JSX.Element => {
  return (
    <div className={styles.list}>
      {sets.map((set) => {
        const flags = prFlags[set.id];
        const hasPr =
          flags && (flags.oneRm || flags.volume || flags.reps);
        return (
          <Card key={set.id} size="sm" className={styles.row}>
            <span className={styles.number}>{set.set_number}</span>
            <span className={styles.value}>
              {formatWeight(set.weight_kg)} × {set.reps}
            </span>
            {hasPr && <span className={styles.prBadge}>{setListCopy.newPr}</span>}
            <span
              className={set.pending ? styles.pending : styles.check}
              role="status"
              aria-label={set.pending ? setListCopy.pendingLabel : setListCopy.syncedLabel}
            >
              {set.pending ? setListCopy.pending : setListCopy.synced}
            </span>
          </Card>
        );
      })}
    </div>
  );
};
