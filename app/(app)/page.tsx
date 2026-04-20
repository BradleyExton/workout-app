import type { JSX } from "react";
import { Card } from "@/components/ui/Card";
import { Mascot } from "@/components/mascot/Mascot";
import { createClient } from "@/lib/supabase/server";
import { currentDate, isoDaysAgo } from "@/lib/domain/time";
import { type MuscleGroup } from "@/lib/db/types";
import { signOut } from "./actions";
import { homeCopy } from "./copy";
import { HomeAchievements } from "./HomeAchievements";
import { HomeCardioCard } from "./HomeCardioCard";
import { HomeMetrics } from "./HomeMetrics";
import { HomeOnboarding } from "./HomeOnboarding";
import { InstallPrompt } from "./InstallPrompt";
import { ResumeCta } from "./ResumeCta";
import * as styles from "./styles";

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
    { data: recentUnlocks },
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
        "id, weight_kg, reps, completed_at, workout_exercise:workout_exercises!inner(workout_id, exercise:exercises!inner(primary_muscle))",
      )
      .gte("completed_at", since30),
    supabase
      .from("workouts")
      .select("started_at")
      .not("finished_at", "is", null)
      .gte("started_at", since60),
    supabase
      .from("cardio_sessions")
      .select("id, started_at, duration_sec, distance_m")
      .gte("started_at", since30),
    supabase
      .from("user_achievements")
      .select("unlocked_at, achievement:achievements!inner(slug, title, icon)")
      .order("unlocked_at", { ascending: false })
      .limit(3),
  ]);

  type RawSetRow = {
    id: string;
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
        id: row.id,
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
    id: row.id,
    started_at: row.started_at,
    duration_sec: row.duration_sec,
    distance_m: row.distance_m,
  }));

  type UnlockRow = {
    unlocked_at: string;
    achievement:
      | { slug: string; title: string; icon: string | null }
      | { slug: string; title: string; icon: string | null }[]
      | null;
  };
  const unlocks = ((recentUnlocks ?? []) as UnlockRow[]).flatMap((row) => {
    const a = Array.isArray(row.achievement) ? row.achievement[0] : row.achievement;
    if (!a) return [];
    return [{ slug: a.slug, title: a.title, icon: a.icon }];
  });

  const now = currentDate();

  const isFreshAccount =
    workoutStartedAts.length === 0 &&
    flatSets.length === 0 &&
    cardioSessions.length === 0 &&
    !activeWorkout;

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

      {isFreshAccount && <HomeOnboarding />}

      <HomeMetrics
        serverFlatSets={flatSets}
        serverWorkoutStartedAts={workoutStartedAts}
        nowMs={now.getTime()}
      />

      <HomeAchievements unlocks={unlocks} />

      <h2 className={styles.cardioHeader}>{homeCopy.cardioHeader}</h2>
      <HomeCardioCard
        serverSessions={cardioSessions}
        nowMs={now.getTime()}
      />

      <InstallPrompt />

      <form action={signOut} className={styles.signOutRow}>
        <button type="submit" className={styles.signOutBtn}>
          {homeCopy.signOut}
        </button>
      </form>

      <div className={styles.ctaZone}>
        <ResumeCta serverActive={activeWorkout ?? null} />
      </div>
    </main>
  );
}
