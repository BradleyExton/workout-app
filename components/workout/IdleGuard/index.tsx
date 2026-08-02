"use client";

// Stops a forgotten session from recording a fictional duration.
//
// Mounted once in the (app) layout, so it watches the session from
// wherever the user happens to be — home, history, the picker — not just
// from the active-workout screen they walked away from.
//
// Three behaviours, in escalating order:
//   45 min with no logged set → ask ("Still training?").
//   4 h with no logged set and no answer → close the session ourselves.
//   Either way → record the duration up to the last set, not up to the
//   moment the app noticed, and say so.
//
// Everything it writes goes through `lib/db/closeWorkout`, i.e. the same
// Dexie-then-`pending_ops` path a tapped Finish uses, so this works with
// no signal and the enqueued op doubles as the tombstone that stops the
// stale server snapshot from re-opening the session.

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type JSX,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  discardWorkoutLocally,
  finishWorkoutLocally,
} from "@/lib/db/closeWorkout";
import { drainQueue } from "@/lib/db/queue";
import { localActiveSession, type LocalSession } from "@/lib/db/session";
import {
  idlePhase,
  lastTrainedAtMs,
  recordedFinishAtMs,
  toMinutes,
  trimmedIdleMs,
  type SessionActivity,
} from "@/lib/domain/idle";
import { useNowMs } from "@/lib/hooks/useSessionClock";
import { idleGuardCopy } from "./copy";
import * as styles from "./styles";

// Re-check every 30s rather than every second: the thresholds are 45 min
// and 4 h, and `useNowMs` re-reads the clock on foreground anyway, which
// is the moment that actually matters after a backgrounded night.
const CHECK_INTERVAL_MS = 30_000;

// Device-local, deliberately not in Dexie and not synced. "I'm still in
// the gym" is a fact about this phone in this moment; replaying it onto
// another device (or into the workout row) would be nonsense.
const ACK_KEY = "workout-idle-ack";

type Ack = { id: string; at: number };

const readAck = (): Ack | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Ack>;
    if (typeof parsed?.id !== "string" || typeof parsed?.at !== "number") {
      return null;
    }
    return { id: parsed.id, at: parsed.at };
  } catch {
    return null;
  }
};

const writeAck = (ack: Ack | null): void => {
  if (typeof window === "undefined") return;
  try {
    if (ack) window.localStorage.setItem(ACK_KEY, JSON.stringify(ack));
    else window.localStorage.removeItem(ACK_KEY);
  } catch {
    // Private mode / quota. Losing the ack only means we ask again.
  }
};

type Notice =
  | {
      kind: "finished";
      durationMin: number;
      setCount: number;
      trimmedMin: number;
    }
  | { kind: "discarded" };

// What just happened, told once.
//
// In storage rather than in component state because closing a session
// unmounts the page it was closing, and React state does not survive
// that trip. It carries its own timestamp and expires: a "we ended your
// workout" card that surfaces tomorrow morning is worse than silence.
const NOTICE_KEY = "workout-idle-notice";
const NOTICE_TTL_MS = 15 * 60_000;

type StoredNotice = { notice: Notice; at: number };

const parseNotice = (raw: string | null): Notice | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredNotice>;
    if (!parsed?.notice || typeof parsed.at !== "number") return null;
    // Stale enough that showing it would be baffling rather than useful.
    if (Date.now() - parsed.at > NOTICE_TTL_MS) return null;
    return parsed.notice;
  } catch {
    return null;
  }
};

// Storage is the record; this is the subscription on top of it.
//
// The component that performs a close is, by the time the close lands,
// often not the component that has to display the result — the page it
// was on has gone. `setState` on the old instance is shouted into a
// void. An external store lets whichever instance happens to be mounted
// pick the message up instead, and the window event carries it even if
// the two instances came from different module evaluations.
const NOTICE_EVENT = "workout-idle-notice";

let cachedRaw: string | null | undefined;
let cachedNotice: Notice | null = null;

// Referentially stable between real changes, as useSyncExternalStore
// requires — re-parsing on every render would hand React a new object
// each time and spin.
const noticeSnapshot = (): Notice | null => {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(NOTICE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedNotice;
  cachedRaw = raw;
  cachedNotice = parseNotice(raw);
  return cachedNotice;
};

const subscribeNotice = (onChange: () => void): (() => void) => {
  window.addEventListener(NOTICE_EVENT, onChange);
  return () => window.removeEventListener(NOTICE_EVENT, onChange);
};

const publishNotice = (notice: Notice | null): void => {
  if (typeof window === "undefined") return;
  try {
    if (notice) {
      const stored: StoredNotice = { notice, at: Date.now() };
      window.localStorage.setItem(NOTICE_KEY, JSON.stringify(stored));
    } else {
      window.localStorage.removeItem(NOTICE_KEY);
    }
  } catch {
    // Private mode / quota: the close still happened, we just can't say so.
  }
  window.dispatchEvent(new Event(NOTICE_EVENT));
};

// Module scope rather than a `useRef`, because this component does not
// survive its own success: closing a session unmounts the page it was
// closing, and a per-instance ref comes back empty on the other side.
// This is only a fast path though — the actual "close it once" guarantee
// is the transaction in lib/db/closeWorkout.
const closingIds = new Set<string>();

export const IdleGuard = (): JSX.Element | null => {
  const nowMs = useNowMs(CHECK_INTERVAL_MS);
  const session = useLiveQuery(localActiveSession, [], undefined);
  // Lazy init rather than an effect: on the server this is null and the
  // component renders nothing anyway (no session yet), so the first
  // client render can safely read storage without a hydration mismatch.
  const [ack, setAck] = useState<Ack | null>(() => readAck());
  const notice = useSyncExternalStore(subscribeNotice, noticeSnapshot, () => null);

  const activity = useMemo<SessionActivity | null>(
    () =>
      session
        ? {
            startedAtMs: session.startedAtMs,
            lastSetAtMs: session.lastSetAtMs,
            ackAtMs: ack?.id === session.id ? ack.at : null,
          }
        : null,
    [session, ack],
  );

  const close = useCallback(
    async (
      target: LocalSession,
      targetActivity: SessionActivity,
      atMs: number,
    ): Promise<void> => {
      // Cheap first pass. The real guarantee is inside the close itself,
      // which does check-and-write in one Dexie transaction; this only
      // saves the common case a round-trip.
      if (closingIds.has(target.id)) return;
      closingIds.add(target.id);

      const finishAtMs = recordedFinishAtMs(targetActivity, atMs);
      const notice: Notice =
        target.setCount === 0
          ? { kind: "discarded" }
          : {
              kind: "finished",
              durationMin: Math.max(
                1,
                toMinutes(finishAtMs - target.startedAtMs),
              ),
              setCount: target.setCount,
              trimmedMin: toMinutes(trimmedIdleMs(targetActivity, atMs)),
            };

      const closedByUs =
        target.setCount === 0
          ? // Nothing was logged, so there is nothing to save and a
            // 0-minute row in history would be pure noise. This is the
            // same call the finish modal makes its default for an empty
            // session.
            await discardWorkoutLocally(target.id)
          : await finishWorkoutLocally(
              target.id,
              new Date(finishAtMs).toISOString(),
            );

      // Someone else got there first: nothing to announce, and above all
      // nothing to erase — the notice in storage is theirs, and an
      // earlier build had the losing caller wipe the winner's message on
      // its way out, which is why the summary never appeared.
      if (!closedByUs) return;

      publishNotice(notice);
      writeAck(null);
      setAck(null);
      void drainQueue();
    },
    [],
  );

  const phase = activity ? idlePhase(activity, nowMs) : "live";

  useEffect(() => {
    if (!session || !activity) return;
    if (idlePhase(activity, nowMs) !== "expired") return;
    // The rule traces `close` down to a setState and assumes a cascading
    // render. It can't cascade: `close` is async, every setState in it
    // lands after the Dexie write, and `closingIds` lets it do real work
    // at most once per session — this effect otherwise re-runs on every
    // tick and every Dexie change. Synchronising React state with an
    // external system (IndexedDB + the write queue) is exactly the case
    // the rule's own docs carve out.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void close(session, activity, nowMs);
  }, [session, activity, nowMs, close]);

  if (notice) {
    return (
      <div className={styles.wrap}>
        <div className={styles.noticeCard} role="status">
          <p className={styles.kicker}>
            {notice.kind === "finished"
              ? idleGuardCopy.savedKicker
              : idleGuardCopy.discardedKicker}
          </p>
          <p className={styles.body}>
            {notice.kind === "finished"
              ? `${idleGuardCopy.savedBody(notice.durationMin, notice.setCount)}${
                  notice.trimmedMin > 0
                    ? idleGuardCopy.savedTrimmed(notice.trimmedMin)
                    : ""
                }`
              : idleGuardCopy.discardedBody}
          </p>
          <button
            type="button"
            className={styles.dismissBtn}
            onClick={() => publishNotice(null)}
          >
            {idleGuardCopy.dismiss}
          </button>
        </div>
      </div>
    );
  }

  if (!session || !activity || phase !== "idle") return null;

  const idleMin = Math.max(1, toMinutes(nowMs - lastTrainedAtMs(activity)));

  const onAck = (): void => {
    const next: Ack = { id: session.id, at: Date.now() };
    writeAck(next);
    setAck(next);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.promptCard} role="alertdialog" aria-live="polite">
        <p className={styles.kicker}>{idleGuardCopy.promptKicker}</p>
        <p className={styles.body}>{idleGuardCopy.promptBody(idleMin)}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.ackBtn} onClick={onAck}>
            {idleGuardCopy.stillGoing}
          </button>
          <button
            type="button"
            className={styles.endBtn}
            onClick={() => void close(session, activity, Date.now())}
          >
            {idleGuardCopy.endWorkout}
          </button>
        </div>
      </div>
    </div>
  );
};
