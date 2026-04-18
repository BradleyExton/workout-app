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

type SetListProps = {
  sets: SetRow[];
};

export const SetList = ({ sets }: SetListProps): JSX.Element => {
  return (
    <div className={styles.list}>
      {sets.map((set) => (
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
