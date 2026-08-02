"use client";

import { type JSX } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Timer } from "@/components/workout/Timer";
import { getDb } from "@/lib/db/dexie";
import { sessionActivity } from "@/lib/db/session";
import { localWorkoutClosures } from "@/lib/db/tombstones";
import { useSessionClock } from "@/lib/hooks/useSessionClock";
import * as buttonStyles from "@/components/ui/Button/styles";
import { resumeCtaCopy } from "./copy";
import * as styles from "./styles";

type ServerActive = { id: string; started_at: string } | null;
// Same thing plus the activity signal, once Dexie has weighed in. Null
// lastSetAtMs means "nothing logged, or we can't see this session's sets"
// — the clock keeps running rather than guessing.
type ResolvedActive =
  | { id: string; started_at: string; lastSetAtMs: number | null }
  | null;

type ResumeCtaProps = {
  serverActive: ServerActive;
};

export const ResumeCta = ({ serverActive }: ResumeCtaProps): JSX.Element => {
  // One querier for the whole decision, so Dexie observes workouts *and*
  // pending_ops and the answer never arrives half-formed.
  //
  // `undefined` = Dexie hasn't answered yet, `null` = nothing to resume.
  const active = useLiveQuery(
    async (): Promise<ResolvedActive> => {
      const { closed } = await localWorkoutClosures();

      const local = await getDb()
        .workouts.filter((w) => w.finished_at === null && !closed.has(w.id))
        .first();
      if (local) {
        const { lastSetAtMs } = await sessionActivity(local.id);
        return { id: local.id, started_at: local.started_at, lastSetAtMs };
      }

      // The server snapshot is only trustworthy for workouts we haven't
      // closed ourselves. Finish or discard offline and it keeps calling
      // that session live until the queue drains — tapping the pill drops
      // the user back into a workout that no longer exists for them.
      // Keyed by id, so an unrelated genuinely-active workout still shows.
      if (serverActive && !closed.has(serverActive.id)) {
        return { ...serverActive, lastSetAtMs: null };
      }
      return null;
    },
    [serverActive],
  );

  // Hooks before the early returns: the resume pill's clock has to obey
  // the same pause rule as the one on the workout screen, or home is the
  // one place still showing a session that ran all night.
  const startedAtMs = active ? new Date(active.started_at).getTime() : 0;
  const clock = useSessionClock(
    active ? { startedAtMs, lastSetAtMs: active.lastSetAtMs, ackAtMs: null } : null,
  );

  // First frame, before IndexedDB answers. If the server thinks a workout
  // is live we can't yet tell a real one from a ghost, so hold the space
  // rather than paint a link that might be a dead end. With no server
  // workout there is nothing to second-guess — show the start CTA at once.
  if (active === undefined && serverActive) {
    return <span className={styles.ctaPlaceholder} aria-hidden />;
  }

  if (active) {
    return (
      <Link
        className={`${styles.ctaInner} ${buttonStyles.variant.primary}`}
        href={`/workout/${active.id}`}
      >
        <span className={clock.paused ? styles.resumeDotPaused : styles.resumeDot} />
        <span>{resumeCtaCopy.backToWorkoutPrefix}</span>
        <Timer since={startedAtMs} stoppedAt={clock.stoppedAt} />
      </Link>
    );
  }

  return (
    <Link
      className={`${styles.ctaInner} ${buttonStyles.variant.primary}`}
      href="/workout/new"
    >
      {resumeCtaCopy.startWorkout}
    </Link>
  );
};
