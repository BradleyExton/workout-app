"use client";

import { useMemo, type JSX } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Card } from "@/components/ui/Card";
import { PipRow } from "@/components/ui/PipRow";
import { Mascot } from "@/components/mascot/Mascot";
import { getDb } from "@/lib/db/dexie";
import { homeCardioCopy } from "./copy";
import * as styles from "./styles";

const CARDIO_TARGET_PER_WEEK = 3;
const WEEK_MS = 7 * 86_400_000;

type ServerCardio = {
  id: string;
  started_at: string;
  duration_sec: number;
  distance_m: number | null;
};

type HomeCardioCardProps = {
  serverSessions: ServerCardio[];
  nowMs: number;
};

export const HomeCardioCard = ({
  serverSessions,
  nowMs,
}: HomeCardioCardProps): JSX.Element => {
  const dexieSessions = useLiveQuery(
    () => getDb().cardio_sessions.toArray(),
    [],
    [],
  );

  const metrics = useMemo(() => {
    const byId = new Map<string, ServerCardio>();
    for (const s of serverSessions) byId.set(s.id, s);
    for (const s of dexieSessions) {
      byId.set(s.id, {
        id: s.id,
        started_at: s.started_at,
        duration_sec: s.duration_sec,
        distance_m: s.distance_m,
      });
    }
    const cutoff = nowMs - WEEK_MS;
    const week = [...byId.values()].filter(
      (s) => new Date(s.started_at).getTime() >= cutoff,
    );
    return {
      sessionsThisWeek: week.length,
      distanceMeters: week.reduce((sum, s) => sum + (s.distance_m ?? 0), 0),
      durationSec: week.reduce((sum, s) => sum + s.duration_sec, 0),
    };
  }, [serverSessions, dexieSessions, nowMs]);

  return (
    <Link href="/cardio/new" className={styles.cardioLink}>
      <Card size="sm" className={styles.cardioCard}>
        <Mascot kind="run" className={styles.cardioMascot} />
        <div className={styles.cardioBody}>
          <div className={styles.cardioTopRow}>
            <p className={styles.cardioTitle}>{homeCardioCopy.title}</p>
            {metrics.sessionsThisWeek > 0 ? (
              <p className={styles.cardioStats}>
                {metrics.distanceMeters > 0 &&
                  `${(metrics.distanceMeters / 1000).toFixed(1)} km · `}
                {Math.round(metrics.durationSec / 60)} min
              </p>
            ) : (
              <p className={styles.cardioEmpty}>{homeCardioCopy.empty}</p>
            )}
          </div>
          <div className={styles.cardioPips}>
            <PipRow
              filled={Math.min(
                metrics.sessionsThisWeek,
                CARDIO_TARGET_PER_WEEK,
              )}
              total={CARDIO_TARGET_PER_WEEK}
            />
          </div>
        </div>
      </Card>
    </Link>
  );
};
