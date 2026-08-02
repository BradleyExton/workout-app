import type { JSX } from "react";
import * as buttonStyles from "@/components/ui/Button/styles";
import { formatVolume } from "@/lib/format/volume";
import { formatWeight } from "@/lib/format/weight";
import type { WorkoutUnlocks } from "../../actions";
import { workoutCompleteCopy } from "./copy";
import * as styles from "./styles";

type WorkoutCompleteProps = {
  setsCount: number;
  volume: number;
  durationMs: number;
  unlocks: WorkoutUnlocks;
  onContinue: () => void;
};

const formatPrValue = (
  type: "1rm" | "volume" | "reps",
  value: number,
): string => {
  if (type === "volume") return formatVolume(value);
  if (type === "reps") return `${value} reps`;
  return `${formatWeight(value)} kg`;
};

// One PR line per exercise: a single strong set can mint 1RM + volume +
// reps records at once, and listing all of them buries the signal. Show
// the most meaningful one (1RM > volume > reps) and count the rest.
const PR_PRIORITY: Record<"1rm" | "volume" | "reps", number> = {
  "1rm": 0,
  volume: 1,
  reps: 2,
};

type PrLine = WorkoutUnlocks["newPrs"][number] & { extraCount: number };

const dedupePrs = (prs: WorkoutUnlocks["newPrs"]): PrLine[] => {
  const byExercise = new Map<string, WorkoutUnlocks["newPrs"]>();
  for (const pr of prs) {
    const list = byExercise.get(pr.exercise_name) ?? [];
    list.push(pr);
    byExercise.set(pr.exercise_name, list);
  }
  return [...byExercise.values()].map((list) => {
    const sorted = [...list].sort(
      (a, b) => PR_PRIORITY[a.pr_type] - PR_PRIORITY[b.pr_type],
    );
    return { ...sorted[0], extraCount: sorted.length - 1 };
  });
};

export const WorkoutComplete = ({
  setsCount,
  volume,
  durationMs,
  unlocks,
  onContinue,
}: WorkoutCompleteProps): JSX.Element => {
  const durationMin = Math.max(1, Math.round(durationMs / 60_000));

  return (
    <div className={styles.screen}>
      <div className={styles.inner}>
        <div className={styles.burst}>
          <p className={styles.burstKicker}>{workoutCompleteCopy.kicker}</p>
          <h1 className={styles.burstTitle}>{workoutCompleteCopy.title}</h1>
          <p className={styles.burstSummary}>
            {workoutCompleteCopy.summary(durationMin, setsCount)}
          </p>
        </div>

        {/* TODO(xp): each row gains a gold XP amount column ("+280"),
            plus rows for the finish bonus and streak multiplier. */}
        <div className={styles.breakdownCard}>
          <div className={styles.breakdownRow}>
            <span>{workoutCompleteCopy.breakdownSets}</span>
            <span className={styles.breakdownValue}>{setsCount}</span>
          </div>
          <div className={styles.breakdownRow}>
            <span>{workoutCompleteCopy.breakdownDuration}</span>
            <span className={styles.breakdownValue}>
              {workoutCompleteCopy.durationValue(durationMin)}
            </span>
          </div>
          <div className={styles.breakdownRow}>
            <span>{workoutCompleteCopy.breakdownVolume}</span>
            <span className={styles.breakdownValue}>{formatVolume(volume)}</span>
          </div>
        </div>

        {unlocks.newPrs.length > 0 && (
          <div className={styles.prCard}>
            {dedupePrs(unlocks.newPrs).map((pr, i) => (
              <div key={`pr-${i}`} className={styles.prRow}>
                <span className={styles.prTag}>
                  {workoutCompleteCopy.newPrLabel}
                </span>
                <span className={styles.prBody}>
                  {pr.exercise_name} ·{" "}
                  {workoutCompleteCopy.prTypeLabel[pr.pr_type]}{" "}
                  {formatPrValue(pr.pr_type, pr.value)}
                  {pr.extraCount > 0 &&
                    ` ${workoutCompleteCopy.prExtra(pr.extraCount)}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {unlocks.newAchievements.map((a) => (
          <div key={a.slug} className={styles.badgeRow}>
            <div className={styles.badgeCoin}>{a.icon ?? "★"}</div>
            <div>
              <p className={styles.badgeKicker}>
                {workoutCompleteCopy.badgeDropKicker}
              </p>
              {/* TODO(xp): achievement XP payout ("+100 XP") next to
                  the title. */}
              <p className={styles.badgeTitle}>{a.title}</p>
            </div>
          </div>
        ))}

        <button
          type="button"
          className={`${buttonStyles.variant.primary} ${styles.cta}`}
          onClick={onContinue}
        >
          {workoutCompleteCopy.continueCta}
        </button>
      </div>
    </div>
  );
};
