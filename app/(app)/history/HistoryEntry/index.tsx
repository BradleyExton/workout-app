"use client";

import { useId, type JSX } from "react";
import { Card } from "@/components/ui/Card";
import {
  dominantMuscle,
  liftStats,
  type CardioItem,
  type HistoryItem,
  type LiftItem,
} from "@/lib/domain/history";
import {
  formatClockTime,
  formatDayLabel,
  formatPacePerKm,
} from "@/lib/format/time";
import { formatVolume } from "@/lib/format/volume";
import { formatWeight } from "@/lib/format/weight";
import { cardioTitle, historyEntryCopy } from "./copy";
import * as styles from "./styles";

type HistoryEntryProps = {
  item: HistoryItem;
  now: Date;
  open: boolean;
  onToggle: () => void;
};

const LiftIcon = (): JSX.Element => (
  <svg viewBox="0 0 24 24" fill="none" className={styles.entryIcon} aria-hidden>
    <path
      d="M4 9v6M8 7v10M16 7v10M20 9v6M8 12h8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CardioIcon = (): JSX.Element => (
  <svg viewBox="0 0 24 24" fill="none" className={styles.entryIcon} aria-hidden>
    <path
      d="M4 12h4l2-5 4 10 2-5h4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Chevron = ({ open }: { open: boolean }): JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={open ? styles.chevronOpen : styles.chevron}
    aria-hidden
  >
    <path
      d="M6 9l6 6 6-6"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Stat = ({ label, value }: { label: string; value: string }): JSX.Element => (
  <div className={styles.stat}>
    <span className={styles.statLabel}>{label}</span>
    <span className={styles.statValue}>{value}</span>
  </div>
);

const LiftDetail = ({ item }: { item: LiftItem }): JSX.Element => {
  const stats = liftStats(item);
  return (
    <>
      <div className={styles.statRow}>
        <Stat
          label={historyEntryCopy.statVolume}
          value={formatVolume(stats.volume)}
        />
        <Stat
          label={historyEntryCopy.statExercises}
          value={String(item.exercises.length)}
        />
        <Stat
          label={historyEntryCopy.statStarted}
          value={formatClockTime(new Date(item.at))}
        />
      </div>

      {stats.durationSuspect && (
        <p className={styles.panelNote}>{historyEntryCopy.suspectDuration}</p>
      )}

      {item.exercises.length === 0 ? (
        <p className={styles.panelNote}>{historyEntryCopy.noExercises}</p>
      ) : (
        <div className={styles.exerciseList}>
          {item.exercises.map((exercise) => (
            <div key={exercise.id} className={styles.exerciseBlock}>
              <div className={styles.exerciseHead}>
                <span className={styles.exerciseName}>
                  {exercise.name ?? historyEntryCopy.unnamedExercise}
                </span>
                <span className={styles.exerciseMeta}>
                  {historyEntryCopy.setCount(exercise.sets.length)}
                </span>
              </div>
              <div className={styles.setPills}>
                {exercise.sets.map((set) => (
                  <span key={set.id} className={styles.setPill}>
                    {formatWeight(set.weight_kg)} × {set.reps}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className={styles.panelNote}>{historyEntryCopy.setLegend}</p>
        </div>
      )}
    </>
  );
};

const CardioDetail = ({ item }: { item: CardioItem }): JSX.Element => {
  const pace = formatPacePerKm(item.duration_sec, item.distance_m);
  return (
    <>
      <div className={styles.statRow}>
        {item.distance_m !== null && (
          <Stat
            label={historyEntryCopy.statDistance}
            value={historyEntryCopy.km(item.distance_m / 1000)}
          />
        )}
        <Stat
          label={historyEntryCopy.statTime}
          value={historyEntryCopy.minutes(
            Math.max(1, Math.round(item.duration_sec / 60)),
          )}
        />
        {pace !== null && (
          <Stat
            label={historyEntryCopy.statPace}
            value={historyEntryCopy.pace(pace)}
          />
        )}
        <Stat
          label={historyEntryCopy.statStarted}
          value={formatClockTime(new Date(item.at))}
        />
      </div>
      {item.distance_m === null && (
        <p className={styles.panelNote}>{historyEntryCopy.noDistance}</p>
      )}
    </>
  );
};

export const HistoryEntry = ({
  item,
  now,
  open,
  onToggle,
}: HistoryEntryProps): JSX.Element => {
  const panelId = useId();
  const at = new Date(item.at);
  const day = formatDayLabel(at, now);

  const title =
    item.kind === "lift"
      ? historyEntryCopy.liftTitle(dominantMuscle(item))
      : cardioTitle[item.modality];

  const detail =
    item.kind === "lift"
      ? historyEntryCopy.liftDetail(
          day,
          liftStats(item).durationMin,
          liftStats(item).sets,
        )
      : historyEntryCopy.cardioDetail(
          day,
          item.distance_m === null ? null : item.distance_m / 1000,
          Math.max(1, Math.round(item.duration_sec / 60)),
        );

  return (
    <Card size="sm" className={styles.entryCard}>
      <button
        type="button"
        className={styles.entryHeader}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span
          className={`${styles.entryIconBase} ${item.kind === "lift" ? styles.entryIconLift : styles.entryIconCardio}`}
        >
          {item.kind === "lift" ? <LiftIcon /> : <CardioIcon />}
        </span>
        <span className={styles.entryBody}>
          <span className={styles.entryTitle}>{title}</span>
          <span className={styles.entryDetail}>{detail}</span>
        </span>
        {/* TODO(xp): the entry's gold XP payout ("+330") sits here,
            left of the chevron, once the XP economy lands. */}
        <Chevron open={open} />
      </button>

      {open && (
        <div id={panelId} className={styles.panel}>
          {item.kind === "lift" ? (
            <LiftDetail item={item} />
          ) : (
            <CardioDetail item={item} />
          )}
          <button type="button" className={styles.closeBtn} onClick={onToggle}>
            {historyEntryCopy.close}
          </button>
        </div>
      )}
    </Card>
  );
};
