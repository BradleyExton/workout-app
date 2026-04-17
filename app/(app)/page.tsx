import type { JSX } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PipRow } from "@/components/ui/PipRow";
import { Mascot } from "@/components/mascot/Mascot";
import { Timer } from "@/components/workout/Timer";
import { createClient } from "@/lib/supabase/server";
import { deriveHomeMetrics } from "@/lib/domain/homeMetrics";
import { currentDate, isoDaysAgo } from "@/lib/domain/time";
import { formatVolume } from "@/lib/format/volume";
import { formatDaysAgo } from "@/lib/format/time";
import { type MuscleGroup } from "@/lib/db/types";
import * as buttonStyles from "@/components/ui/Button/styles";
import { signOut } from "./actions";
import { homeCopy } from "./copy";
import * as styles from "./styles";

const CARDIO_TARGET_PER_WEEK = 3;

const formatHeaderDate = (now: Date): string => {
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const mdy = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${weekday} · ${mdy}`;
};

const deriveName = (email: string | null | undefined): string => {
  if (!email) return "FRIEND";
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? "";
  return first.toUpperCase() || "FRIEND";
};

const PIPS_PER_MUSCLE = 5;

export default async function HomePage(): Promise<JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const since30 = isoDaysAgo(30);
  const since60 = isoDaysAgo(60);

  const [
    { data: activeWorkout },
    { data: rawSets },
    { data: finishedWorkouts },
    { data: rawCardio },
  ] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, started_at")
      .is("finished_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sets")
      .select(
        "weight_kg, reps, completed_at, workout_exercise:workout_exercises!inner(workout_id, exercise:exercises!inner(primary_muscle))",
      )
      .gte("completed_at", since30),
    supabase
      .from("workouts")
      .select("started_at")
      .not("finished_at", "is", null)
      .gte("started_at", since60),
    supabase
      .from("cardio_sessions")
      .select("started_at, duration_sec, distance_m")
      .gte("started_at", since30),
  ]);

  type RawSetRow = {
    weight_kg: number | string;
    reps: number;
    completed_at: string;
    workout_exercise:
      | {
          workout_id: string;
          exercise: { primary_muscle: MuscleGroup } | { primary_muscle: MuscleGroup }[] | null;
        }
      | { workout_id: string; exercise: { primary_muscle: MuscleGroup } | { primary_muscle: MuscleGroup }[] | null }[]
      | null;
  };

  const flatSets = ((rawSets ?? []) as RawSetRow[]).flatMap((row) => {
    const we = Array.isArray(row.workout_exercise)
      ? row.workout_exercise[0]
      : row.workout_exercise;
    if (!we) return [];
    const ex = Array.isArray(we.exercise) ? we.exercise[0] : we.exercise;
    if (!ex) return [];
    return [
      {
        weight_kg: Number(row.weight_kg),
        reps: row.reps,
        completed_at: row.completed_at,
        workout_id: we.workout_id,
        primary_muscle: ex.primary_muscle,
      },
    ];
  });

  const workoutStartedAts = (finishedWorkouts ?? []).map((w) => w.started_at);
  const cardioSessions = (rawCardio ?? []).map((row) => ({
    started_at: row.started_at,
    duration_sec: row.duration_sec,
    distance_m: row.distance_m,
  }));
  const now = currentDate();
  const metrics = deriveHomeMetrics(
    flatSets,
    workoutStartedAts,
    cardioSessions,
    now,
  );

  const headerDate = formatHeaderDate(now);
  const displayName = deriveName(user?.email);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <span className={styles.headerDate}>{headerDate}</span>
          <h1 className={styles.headerGreeting}>
            {homeCopy.greetingPrefix}
            <br />
            {displayName}!
          </h1>
        </div>
        <Card variant="lime" className={styles.mascotWrap}>
          <Mascot kind="flex-hero" className={styles.mascot} />
        </Card>
      </div>

      <Card variant="black" className={styles.coverageHero}>
        <p className={styles.coverageKicker}>{homeCopy.coverageKicker}</p>
        <div className={styles.coverageNumbersRow}>
          <span className={styles.coverageBigNumber}>
            {metrics.groupsHitThisWeek}
          </span>
          <span className={styles.coverageOfText}>{homeCopy.coverageOf}</span>
          <span className={styles.coverageSuffix}>{homeCopy.coverageSuffix}</span>
        </div>
        <PipRow
          filled={metrics.groupsHitThisWeek}
          total={6}
          inverse
          className="mt-3"
        />
      </Card>

      <div className={styles.statsRow}>
        <Card variant="lime" size="sm" className={styles.statCard}>
          <p className={styles.statLabel}>{homeCopy.statWorkouts}</p>
          <p className={styles.statValue}>{metrics.workoutsThisWeek}</p>
        </Card>
        <Card variant="white" size="sm" className={styles.statCard}>
          <p className={styles.statLabel}>{homeCopy.statVolume}</p>
          <p className={styles.statValue}>{formatVolume(metrics.volumeThisWeek)}</p>
        </Card>
        <Card variant="black" size="sm" className={styles.statCard}>
          <p className={styles.statLabel}>{homeCopy.statStreak}</p>
          <p className={styles.statValue}>{metrics.streakDays}d</p>
        </Card>
      </div>

      <h2 className={styles.musclesHeader}>{homeCopy.musclesHeader}</h2>
      <div className={styles.muscleGrid}>
        {metrics.coverage.map((entry) => (
          <Card
            key={entry.group}
            size="sm"
            variant={entry.setsThisWeek === 0 ? "cream" : "white"}
            className={styles.muscleCard}
          >
            <p className={styles.muscleName}>{entry.group.toUpperCase()}</p>
            <PipRow
              filled={Math.min(entry.setsThisWeek, PIPS_PER_MUSCLE)}
              total={PIPS_PER_MUSCLE}
              size="sm"
              className="mt-1"
            />
            <p className={styles.muscleDaysRow}>
              {entry.overdue && <span className={styles.muscleDot} />}
              {formatDaysAgo(entry.lastHitDaysAgo)}
            </p>
          </Card>
        ))}
      </div>

      <h2 className={styles.cardioHeader}>{homeCopy.cardioHeader}</h2>
      <Link href="/cardio/new" className={styles.cardioLink}>
        <Card size="sm" className={styles.cardioCard}>
          <Mascot kind="run" className={styles.cardioMascot} />
          <div className={styles.cardioBody}>
            <div className={styles.cardioTopRow}>
              <p className={styles.cardioTitle}>CARDIO</p>
              {metrics.cardio.sessionsThisWeek > 0 ? (
                <p className={styles.cardioStats}>
                  {metrics.cardio.distanceMeters > 0 &&
                    `${(metrics.cardio.distanceMeters / 1000).toFixed(1)} km · `}
                  {Math.round(metrics.cardio.durationSec / 60)} min
                </p>
              ) : (
                <p className={styles.cardioEmpty}>{homeCopy.cardioEmpty}</p>
              )}
            </div>
            <div className={styles.cardioPips}>
              <PipRow
                filled={Math.min(
                  metrics.cardio.sessionsThisWeek,
                  CARDIO_TARGET_PER_WEEK,
                )}
                total={CARDIO_TARGET_PER_WEEK}
              />
            </div>
          </div>
        </Card>
      </Link>

      <form action={signOut} className={styles.signOutRow}>
        <button type="submit" className={styles.signOutBtn}>
          {homeCopy.signOut}
        </button>
      </form>

      <div className={styles.ctaZone}>
        {activeWorkout ? (
          <Link
            className={`${styles.ctaInner} ${buttonStyles.variant.primary}`}
            href={`/workout/${activeWorkout.id}`}
          >
            <span className={styles.resumeDot} />
            <span>{homeCopy.backToWorkoutPrefix}</span>
            <Timer since={new Date(activeWorkout.started_at).getTime()} />
          </Link>
        ) : (
          <Link
            className={`${styles.ctaInner} ${buttonStyles.variant.primary}`}
            href="/workout/new"
          >
            {homeCopy.startWorkout}
          </Link>
        )}
      </div>
    </main>
  );
}
