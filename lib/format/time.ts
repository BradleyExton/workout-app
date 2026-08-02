import { calendarDaysBetween } from "@/lib/domain/time";

const MS_PER_DAY = 86_400_000;

export const relativeDays = (iso: string, now: Date = new Date()): string => {
  const then = new Date(iso).getTime();
  const days = Math.floor((now.getTime() - then) / MS_PER_DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

export const formatDaysAgo = (days: number | null): string => {
  if (days === null) return "—";
  if (days === 0) return "today";
  return `${days}d`;
};

export const formatElapsed = (ms: number): string => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

// "Tue, Apr 14" — a real date that still scans in a list row. The year is
// deliberately absent; the month heading above the group carries it.
export const formatShortDate = (date: Date): string =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

// The two most recent days keep their friendly name — "Tue, Apr 14" for
// something that happened four hours ago reads like archive material.
// Everything older gets the real date.
export const formatDayLabel = (date: Date, now: Date = new Date()): string => {
  const days = calendarDaysBetween(date, now);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return formatShortDate(date);
};

export const formatClockTime = (date: Date): string =>
  date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

// Cardio pace as mm:ss per km. null when there's no distance to divide by
// — a treadmill session logged without distance has no honest pace.
export const formatPacePerKm = (
  durationSec: number,
  distanceM: number | null,
): string | null => {
  if (distanceM === null || distanceM <= 0 || durationSec <= 0) return null;
  const secPerKm = Math.round(durationSec / (distanceM / 1000));
  const mins = Math.floor(secPerKm / 60);
  const secs = secPerKm % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};
