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
            {unlocks.newPrs.map((pr, i) => (
              <div key={`pr-${i}`} className={styles.prRow}>
                <span className={styles.prTag}>
                  {workoutCompleteCopy.newPrLabel}
                </span>
                <span className={styles.prBody}>
                  {pr.exercise_name} ·{" "}
                  {workoutCompleteCopy.prTypeLabel[pr.pr_type]}{" "}
                  {formatPrValue(pr.pr_type, pr.value)}
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
