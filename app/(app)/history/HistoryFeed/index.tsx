"use client";

import { useMemo, useState, type JSX } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import * as buttonStyles from "@/components/ui/Button/styles";
import { getDb } from "@/lib/db/dexie";
import type { DeleteSetPayload } from "@/lib/db/queue";
import {
  buildHistoryItems,
  type HistoryItem,
  type HistorySnapshot,
} from "@/lib/domain/history";
import { localDayKey, localMonthKey } from "@/lib/domain/time";
import { HistoryEntry } from "../HistoryEntry";
import { historyFeedCopy } from "./copy";
import * as styles from "./styles";

const WEEK_STRIP_DAYS = 7;

const narrowWeekday = (date: Date): string =>
  date.toLocaleDateString("en-US", { weekday: "narrow" });
const monthName = (date: Date): string =>
  date.toLocaleDateString("en-US", { month: "long" });
const fullDate = (date: Date): string =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

type HistoryFeedProps = {
  snapshot: HistorySnapshot;
  nowMs: number;
  sinceMs: number;
};

type MonthGroup = {
  key: string;
  label: string;
  year: number;
  items: HistoryItem[];
};

export const HistoryFeed = ({
  snapshot,
  nowMs,
  sinceMs,
}: HistoryFeedProps): JSX.Element => {
  // Accordion: one entry open at a time, so the feed never turns into a
  // wall of expanded cards you have to scroll past.
  const [openKey, setOpenKey] = useState<string | null>(null);

  const dexieWorkouts = useLiveQuery(
    () =>
      getDb()
        .workouts.filter((workout) => workout.finished_at !== null)
        .toArray(),
    [],
    [],
  );
  const dexieExercises = useLiveQuery(
    () => getDb().workout_exercises.toArray(),
    [],
    [],
  );
  const dexieSets = useLiveQuery(() => getDb().sets.toArray(), [], []);
  const dexieCardio = useLiveQuery(
    () => getDb().cardio_sessions.toArray(),
    [],
    [],
  );

  // Tombstones: a set deleted locally must not be resurrected by the
  // server snapshot the page shipped with. Includes already-synced ops —
  // they linger for 24h, long past the next server render.
  const deletedSetIds = useLiveQuery(
    async () => {
      const ops = await getDb()
        .pending_ops.filter((op) => op.type === "deleteSet")
        .toArray();
      return new Set(ops.map((op) => (op.payload as DeleteSetPayload).id));
    },
    [],
    new Set<string>(),
  );

  const items = useMemo(
    () =>
      buildHistoryItems(
        snapshot,
        {
          workouts: dexieWorkouts,
          exercises: dexieExercises,
          sets: dexieSets,
          cardio: dexieCardio,
          deletedSetIds,
        },
        sinceMs,
      ),
    [
      snapshot,
      dexieWorkouts,
      dexieExercises,
      dexieSets,
      dexieCardio,
      deletedSetIds,
      sinceMs,
    ],
  );

  const now = useMemo(() => new Date(nowMs), [nowMs]);

  const week = useMemo(() => {
    const loggedDays = new Set(
      items.map((item) => localDayKey(new Date(item.at))),
    );
    return Array.from({ length: WEEK_STRIP_DAYS }, (_, index) => {
      const date = new Date(nowMs);
      date.setDate(date.getDate() - (WEEK_STRIP_DAYS - 1 - index));
      const key = localDayKey(date);
      const hit = loggedDays.has(key);
      return {
        key,
        label: narrowWeekday(date),
        aria: historyFeedCopy.dayAria(fullDate(date), hit),
        hit,
      };
    });
  }, [items, nowMs]);

  // Items stay in date order; each month change opens a new group.
  const months = useMemo(() => {
    const groups: MonthGroup[] = [];
    for (const item of items) {
      const at = new Date(item.at);
      const key = localMonthKey(at);
      const current = groups.at(-1);
      if (current?.key === key) {
        current.items.push(item);
        continue;
      }
      groups.push({
        key,
        label: monthName(at),
        year: at.getFullYear(),
        items: [item],
      });
    }
    return groups;
  }, [items]);

  return (
    <>
      <div className={styles.weekBlock}>
        <p className={styles.weekKicker}>{historyFeedCopy.weekKicker}</p>
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
          <p className={styles.emptyText}>{historyFeedCopy.empty}</p>
          <p className={styles.emptyHint}>{historyFeedCopy.emptyHint}</p>
          <Link
            href="/workout/new"
            className={`${buttonStyles.variant.primary} ${styles.emptyCta}`}
          >
            {historyFeedCopy.emptyCta}
          </Link>
        </div>
      ) : (
        months.map((month) => (
          <section key={month.key} className={styles.monthGroup}>
            <h2 className={styles.monthHeading}>
              {month.label} <span className={styles.monthYear}>{month.year}</span>
            </h2>
            <div className={styles.entryList}>
              {month.items.map((item) => {
                const key = `${item.kind}-${item.id}`;
                return (
                  <HistoryEntry
                    key={key}
                    item={item}
                    now={now}
                    open={openKey === key}
                    onToggle={() =>
                      setOpenKey((current) => (current === key ? null : key))
                    }
                  />
                );
              })}
            </div>
          </section>
        ))
      )}
    </>
  );
};
