// When a workout session stops being a workout session.
//
// The timer used to count from `started_at` forever, so a session the
// user forgot to finish recorded whatever the clock said when they
// finally noticed — the dev database has a 5-set workout at 174 min and
// a 2-set one at 288 min. Those numbers then flow into history, the
// session summary and the home metrics, which makes every duration in
// the app suspect.
//
// Everything here is pure so the thresholds can be reasoned about (and
// time can be simulated) without touching Dexie or the DOM.

const MIN_MS = 60_000;
const HOUR_MS = 60 * MIN_MS;

// --- Thresholds -------------------------------------------------------
//
// This is a PWA that spends most of a workout backgrounded with the
// screen off, so the only thing we can treat as proof of training is a
// *logged set*. That makes the thresholds a question about rest, not
// about app usage.
//
// 45 minutes to the "still training?" prompt. Real inter-set rest tops
// out around 5-10 min for heavy singles; add a queue for the rack, a
// bathroom break and a conversation and 20 min is still a normal gym.
// 45 min is comfortably past anything a lifter does between sets, so the
// prompt never fires on someone mid-session, and it is short enough that
// the app asks while the user is plausibly still in the building.
export const IDLE_PROMPT_MS = 45 * MIN_MS;

// 4 hours to auto-close. Nobody trains for 4 hours without logging
// anything; at that point the session is over whatever the user meant.
// It is also short enough that the classic failure — finish at 19:00,
// reopen the app at midnight — is cleaned up before the row can reach
// history as a five-hour workout.
export const IDLE_AUTO_CLOSE_MS = 4 * HOUR_MS;

// A recorded duration above this is longer than a lifting session
// realistically runs, so it is much more likely to be a timer nobody
// stopped. 2.5 h catches both rows the audit found (174 min over 5 sets,
// 288 min over 2) while leaving a genuinely marathon session alone.
//
// Used only to caveat rows written before the timer learned to stop —
// never to rewrite them.
export const IMPLAUSIBLE_DURATION_MS = 150 * MIN_MS;

export type SessionActivity = {
  startedAtMs: number;
  // completed_at of the newest set in the session, or null when nothing
  // has been logged yet.
  lastSetAtMs: number | null;
  // When the user last answered "yes, still training" on this device.
  // Device-local and deliberately not synced: it is evidence about a
  // person standing in a gym, not about the workout.
  ackAtMs: number | null;
};

export type IdlePhase =
  // Training, or resting normally between sets.
  | "live"
  // Long enough without a set that it's worth asking.
  | "idle"
  // Long enough that the answer no longer matters.
  | "expired";

const finite = (value: number | null): number | null =>
  value !== null && Number.isFinite(value) ? value : null;

// The last moment we have evidence that *training* happened. This is the
// number the recorded duration is built from.
export const lastTrainedAtMs = (activity: SessionActivity): number => {
  const lastSet = finite(activity.lastSetAtMs);
  if (lastSet === null) return activity.startedAtMs;
  return Math.max(activity.startedAtMs, lastSet);
};

// The last moment we have evidence the *user* was present. An "I'm still
// going" tap counts here and nowhere else: it buys the session more time
// before auto-close, but it must never inflate the duration, because
// tapping a button is not a set.
export const lastPresenceAtMs = (activity: SessionActivity): number => {
  const ack = finite(activity.ackAtMs) ?? 0;
  return Math.max(lastTrainedAtMs(activity), ack);
};

export const idlePhase = (
  activity: SessionActivity,
  nowMs: number,
): IdlePhase => {
  const since = nowMs - lastPresenceAtMs(activity);
  if (since >= IDLE_AUTO_CLOSE_MS) return "expired";
  if (since >= IDLE_PROMPT_MS) return "idle";
  return "live";
};

// The instant the on-screen clock freezes at, or null while it should
// keep counting. Note this reads `lastTrainedAtMs`, not presence: after
// an ack the clock stays stopped, because the honest statement is "you
// are not lifting right now", and it starts moving again the moment the
// next set lands.
export const timerStopAtMs = (
  activity: SessionActivity,
  nowMs: number,
): number | null => {
  const lastTrained = lastTrainedAtMs(activity);
  return nowMs - lastTrained >= IDLE_PROMPT_MS ? lastTrained : null;
};

// What `finished_at` should say. Trailing dead time past the prompt
// threshold is dropped: "you trained until your last set" is a defensible
// claim, "you trained until the app noticed" is not.
//
// Below the threshold we record the real clock, so the ordinary case —
// rack the last set, stretch, take a photo, hit Finish — still counts
// those minutes instead of clipping the session at the last rep.
export const recordedFinishAtMs = (
  activity: SessionActivity,
  nowMs: number,
): number => timerStopAtMs(activity, nowMs) ?? nowMs;

// How much wall-clock time the recorded duration leaves out. Zero unless
// the session was trimmed — used to tell the user what happened rather
// than quietly hand them a smaller number.
export const trimmedIdleMs = (
  activity: SessionActivity,
  nowMs: number,
): number => Math.max(0, nowMs - recordedFinishAtMs(activity, nowMs));

export const toMinutes = (ms: number): number => Math.round(ms / MIN_MS);
