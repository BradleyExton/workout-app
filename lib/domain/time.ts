const MS_PER_DAY = 86_400_000;

export const isoDaysAgo = (days: number): string =>
  new Date(Date.now() - days * MS_PER_DAY).toISOString();

export const currentDate = (): Date => new Date();

// Local-calendar keys. Anything the user reads as "a day" (the history
// week strip, month groups, "yesterday") has to line up with the day they
// actually trained, not with the UTC instant.
export const localDayKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export const localMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}`;

// Whole calendar days between two instants, times of day ignored — so a
// session at 11pm is "yesterday" at 1am the next morning, not "0 days".
export const calendarDaysBetween = (from: Date, to: Date): number => {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
};

// The quick-log "when" control: cardio gets logged after the fact far more
// often than during, so the form has to be able to say "not now" without
// turning into a datetime picker.
export type WhenChoice = "now" | "today" | "yesterday";

// `<input type="time">` hands back "HH:MM" (occasionally "HH:MM:SS" — Safari
// includes seconds when a step is set), and wants "HH:MM" back.
const CLOCK_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

export const clockValue = (date: Date): string =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export const parseClockValue = (
  time: string,
): { hours: number; minutes: number } | null => {
  const match = CLOCK_PATTERN.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
};

// Resolves the "when" control to a real instant. `time` is the raw time-input
// value and is ignored for "now". Returns null when the choice needs a time
// and the field is blank or unparseable — the caller raises a form error
// rather than quietly guessing a timestamp.
export const composeStartedAt = (
  when: WhenChoice,
  time: string,
  now: Date = new Date(),
): Date | null => {
  if (when === "now") return new Date(now.getTime());
  const clock = parseClockValue(time);
  if (!clock) return null;
  // Built from local calendar parts, so the day rollback crosses months and
  // years correctly and DST is the platform's problem rather than ours.
  // Seconds are zeroed: the user gave us minute precision, not more.
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - (when === "yesterday" ? 1 : 0),
    clock.hours,
    clock.minutes,
    0,
    0,
  );
};
