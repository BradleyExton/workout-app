"use client";

// The first-run card. It stays until the account has actually *banked*
// something — a finished workout or a logged cardio session.
//
// It used to vanish the moment a workout was started, which is precisely
// when the guidance is still needed: nothing on screen says how a session
// ends. So "started" no longer counts; only a finish does.
//
// Client-side on purpose. The flag was computed on the server, and the
// server can't see a first workout finished offline — it would keep
// greeting the user with "start your first workout" for as long as the
// queue took to drain, i.e. exactly when they'd earned the opposite.
// Dexie plus the pending-op tombstones are the same source of truth the
// rest of home (metrics, resume CTA) already reads.

import type { JSX } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card } from "@/components/ui/Card";
import { getDb } from "@/lib/db/dexie";
import { localWorkoutClosures } from "@/lib/db/tombstones";
import { homeOnboardingCopy } from "./copy";
import * as styles from "./styles";

type HomeOnboardingProps = {
  // Lifetime counts from the server snapshot. Local knowledge only ever
  // *adds* history, never removes it, so `false` here plus a quiet Dexie
  // is a genuinely fresh account.
  serverHasHistory: boolean;
  serverActiveWorkoutId: string | null;
};

type LocalView = {
  hasHistory: boolean;
  live: boolean;
};

export const HomeOnboarding = ({
  serverHasHistory,
  serverActiveWorkoutId,
}: HomeOnboardingProps): JSX.Element | null => {
  const local = useLiveQuery(
    async (): Promise<LocalView> => {
      const db = getDb();
      const { closed, finished } = await localWorkoutClosures();

      const finishedLocally =
        finished.size > 0 ||
        (await db.workouts.filter((w) => w.finished_at !== null).count()) > 0;
      const cardioLocally = await db.cardio_sessions.count();

      // A workout the user closed offline is not live, however active the
      // server snapshot still believes it to be — same ghost rule the
      // resume CTA applies, off the same tombstones.
      const openLocally = await db.workouts
        .filter((w) => w.finished_at === null && !closed.has(w.id))
        .count();
      const live =
        openLocally > 0 ||
        (serverActiveWorkoutId !== null && !closed.has(serverActiveWorkoutId));

      return { hasHistory: finishedLocally || cardioLocally > 0, live };
    },
    [serverActiveWorkoutId],
    // First frame (and SSR) goes with the server's answer: the fresh
    // account this card exists for has nothing in Dexie anyway, so the
    // card ships inside the HTML instead of popping in after hydration.
    { hasHistory: false, live: serverActiveWorkoutId !== null },
  );

  if (serverHasHistory || local.hasHistory) return null;

  return (
    <Card variant="plasma" className={styles.card}>
      <span className={styles.kicker}>
        {local.live ? homeOnboardingCopy.liveKicker : homeOnboardingCopy.kicker}
      </span>
      <h2 className={styles.title}>
        {local.live ? homeOnboardingCopy.liveTitle : homeOnboardingCopy.title}
      </h2>
      <p className={styles.body}>
        {local.live ? homeOnboardingCopy.liveBody : homeOnboardingCopy.body}
      </p>
    </Card>
  );
};
