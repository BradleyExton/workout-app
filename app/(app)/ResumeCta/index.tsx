"use client";

import { type JSX } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Timer } from "@/components/workout/Timer";
import { getDb } from "@/lib/db/dexie";
import { localWorkoutClosures } from "@/lib/db/tombstones";
import * as buttonStyles from "@/components/ui/Button/styles";
import { resumeCtaCopy } from "./copy";
import * as styles from "./styles";

type ServerActive = { id: string; started_at: string } | null;

type ResumeCtaProps = {
  serverActive: ServerActive;
};

export const ResumeCta = ({ serverActive }: ResumeCtaProps): JSX.Element => {
  // One querier for the whole decision, so Dexie observes workouts *and*
  // pending_ops and the answer never arrives half-formed.
  //
  // `undefined` = Dexie hasn't answered yet, `null` = nothing to resume.
  const active = useLiveQuery(
    async (): Promise<ServerActive> => {
      const { closed } = await localWorkoutClosures();

      const local = await getDb()
        .workouts.filter((w) => w.finished_at === null && !closed.has(w.id))
        .first();
      if (local) return { id: local.id, started_at: local.started_at };

      // The server snapshot is only trustworthy for workouts we haven't
      // closed ourselves. Finish or discard offline and it keeps calling
      // that session live until the queue drains — tapping the pill drops
      // the user back into a workout that no longer exists for them.
      // Keyed by id, so an unrelated genuinely-active workout still shows.
      if (serverActive && !closed.has(serverActive.id)) return serverActive;
      return null;
    },
    [serverActive],
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
        <span className={styles.resumeDot} />
        <span>{resumeCtaCopy.backToWorkoutPrefix}</span>
        <Timer since={new Date(active.started_at).getTime()} />
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
