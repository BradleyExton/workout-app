import type { JSX } from "react";
import { Card } from "@/components/ui/Card";
import { currentDate, isoDaysAgo } from "@/lib/domain/time";
import { createClient } from "@/lib/supabase/server";
import type { CardioModality, MuscleGroup } from "@/lib/db/types";
import { cardioTitle, historyCopy } from "./copy";
import * as styles from "./styles";

const HISTORY_DAYS = 180;
const WEEK_STRIP_DAYS = 7;

// Local-calendar keys: the week strip has to line up with the day the user
// actually trained, not with the UTC instant.
const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const monthKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}`;

const narrowWeekday = (date: Date): string =>
  date.toLocaleDateString("en-US", { weekday: "narrow" });
const shortWeekday = (date: Date): string =>
  date.toLocaleDateString("en-US", { weekday: "short" });
const monthName = (date: Date): string =>
  date.toLocaleDateString("en-US", { month: "long" });
const fullDate = (date: Date): string =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

type EntryKind = "lift" | "cardio";

type HistoryEntry = {
  id: string;
  kind: EntryKind;
  at: Date;
  title: string;
  detail: string;
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

export default async function HistoryPage(): Promise<JSX.Element> {
  const supabase = await createClient();
  const since = isoDaysAgo(HISTORY_DAYS);

  const [{ data: rawWorkouts }, { data: rawSets }, { data: rawCardio }] =
    await Promise.all([
      supabase
        .from("workouts")
        .select("id, started_at, finished_at")
        .not("finished_at", "is", null)
        .gte("started_at", since)
        .order("started_at", { ascending: false }),
      supabase
        .from("sets")
        .select(
          "id, workout_exercise:workout_exercises!inner(workout_id, exercise:exercises!inner(primary_muscle))",
        )
        .gte("completed_at", since),
      supabase
        .from("cardio_sessions")
        .select("id, started_at, duration_sec, distance_m, modality")
        .gte("started_at", since)
        .order("started_at", { ascending: false }),
    ]);

  type RawSetRow = {
    id: string;
    workout_exercise:
      | {
          workout_id: string;
          exercise:
            | { primary_muscle: MuscleGroup }
            | { primary_muscle: MuscleGroup }[]
            | null;
        }
      | {
          workout_id: string;
          exercise:
            | { primary_muscle: MuscleGroup }
            | { primary_muscle: MuscleGroup }[]
            | null;
        }[]
      | null;
  };

  // Per workout: how many sets, and which muscle group dominated (that's
  // what names the row — "Legs Day" — since workouts carry no title).
  const setCounts = new Map<string, number>();
  const muscleTally = new Map<string, Map<MuscleGroup, number>>();

  for (const row of (rawSets ?? []) as RawSetRow[]) {
    const we = Array.isArray(row.workout_exercise)
      ? row.workout_exercise[0]
      : row.workout_exercise;
    if (!we) continue;
    setCounts.set(we.workout_id, (setCounts.get(we.workout_id) ?? 0) + 1);

    const exercise = Array.isArray(we.exercise) ? we.exercise[0] : we.exercise;
    if (!exercise) continue;
    const tally = muscleTally.get(we.workout_id) ?? new Map<MuscleGroup, number>();
    tally.set(
      exercise.primary_muscle,
      (tally.get(exercise.primary_muscle) ?? 0) + 1,
    );
    muscleTally.set(we.workout_id, tally);
  }

  const dominantMuscle = (workoutId: string): MuscleGroup | null => {
    const tally = muscleTally.get(workoutId);
    if (!tally) return null;
    let best: MuscleGroup | null = null;
    let bestCount = 0;
    for (const [group, count] of tally) {
      if (count > bestCount) {
        best = group;
        bestCount = count;
      }
    }
    return best;
  };

  const liftEntries: HistoryEntry[] = (rawWorkouts ?? []).map((workout) => {
    const startedAt = new Date(workout.started_at);
    const finishedAt = new Date(workout.finished_at ?? workout.started_at);
    const durationMin = Math.max(
      1,
      Math.round((finishedAt.getTime() - startedAt.getTime()) / 60_000),
    );
    return {
      id: workout.id,
      kind: "lift",
      at: startedAt,
      title: historyCopy.liftTitle(dominantMuscle(workout.id)),
      detail: historyCopy.liftDetail(
        shortWeekday(startedAt),
        durationMin,
        setCounts.get(workout.id) ?? 0,
      ),
    };
  });

  const cardioEntries: HistoryEntry[] = (rawCardio ?? []).map((session) => {
    const startedAt = new Date(session.started_at);
    return {
      id: session.id,
      kind: "cardio",
      at: startedAt,
      title: cardioTitle[session.modality as CardioModality],
      detail: historyCopy.cardioDetail(
        shortWeekday(startedAt),
        session.distance_m === null ? null : session.distance_m / 1000,
        Math.max(1, Math.round(session.duration_sec / 60)),
      ),
    };
  });

  const entries = [...liftEntries, ...cardioEntries].sort(
    (a, b) => b.at.getTime() - a.at.getTime(),
  );

  const now = currentDate();
  const loggedDays = new Set(entries.map((entry) => dayKey(entry.at)));
  const week = Array.from({ length: WEEK_STRIP_DAYS }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (WEEK_STRIP_DAYS - 1 - index));
    const key = dayKey(date);
    return {
      key,
      label: narrowWeekday(date),
      aria: historyCopy.dayAria(fullDate(date), loggedDays.has(key)),
      hit: loggedDays.has(key),
    };
  });

  // Entries stay in date order; each month change opens a new group.
  const months: { key: string; label: string; year: number; entries: HistoryEntry[] }[] = [];
  for (const entry of entries) {
    const key = monthKey(entry.at);
    const current = months.at(-1);
    if (current?.key === key) {
      current.entries.push(entry);
      continue;
    }
    months.push({
      key,
      label: monthName(entry.at),
      year: entry.at.getFullYear(),
      entries: [entry],
    });
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{historyCopy.title}</h1>

      <div className={styles.weekBlock}>
        <p className={styles.weekKicker}>{historyCopy.weekKicker}</p>
        <div className={styles.weekStrip}>
          {week.map((day) => (
            <div
              key={day.key}
              aria-label={day.aria}
              className={`${styles.weekCellBase} ${day.hit ? styles.weekCellHit : styles.weekCellIdle}`}
            >
              {day.label}
            </div>
          ))}
        </div>
      </div>

      {months.length === 0 ? (
        <div className={styles.emptyBlock}>
          <p className={styles.emptyText}>{historyCopy.empty}</p>
          <p className={styles.emptyHint}>{historyCopy.emptyHint}</p>
        </div>
      ) : (
        months.map((month) => (
          <section key={month.key} className={styles.monthGroup}>
            <h2 className={styles.monthHeading}>
              {month.label} <span className={styles.monthYear}>{month.year}</span>
            </h2>
            <div className={styles.entryList}>
              {month.entries.map((entry) => (
                <Card
                  key={`${entry.kind}-${entry.id}`}
                  size="sm"
                  className={styles.entryRow}
                >
                  <span
                    className={`${styles.entryIconBase} ${entry.kind === "lift" ? styles.entryIconLift : styles.entryIconCardio}`}
                  >
                    {entry.kind === "lift" ? <LiftIcon /> : <CardioIcon />}
                  </span>
                  <div className={styles.entryBody}>
                    <p className={styles.entryTitle}>{entry.title}</p>
                    <p className={styles.entryDetail}>{entry.detail}</p>
                  </div>
                  {/* TODO(xp): the entry's gold XP payout ("+330") sits here,
                      right-aligned, once the XP economy lands. */}
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
