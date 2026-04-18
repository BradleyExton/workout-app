"use client";

import { useMemo, type JSX } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Timer } from "@/components/workout/Timer";
import { getDb } from "@/lib/db/dexie";
import * as buttonStyles from "@/components/ui/Button/styles";
import { resumeCtaCopy } from "./copy";
import * as styles from "./styles";

type ServerActive = { id: string; started_at: string } | null;

type ResumeCtaProps = {
  serverActive: ServerActive;
};

export const ResumeCta = ({ serverActive }: ResumeCtaProps): JSX.Element => {
  const dexieActive = useLiveQuery(
    () =>
      getDb()
        .workouts.filter((w) => w.finished_at === null)
        .first(),
    [],
    undefined,
  );

  const active = useMemo<ServerActive>(() => {
    if (dexieActive) {
      return { id: dexieActive.id, started_at: dexieActive.started_at };
    }
    return serverActive;
  }, [dexieActive, serverActive]);

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
