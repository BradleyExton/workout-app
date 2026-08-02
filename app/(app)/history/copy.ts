import type { CardioModality } from "@/lib/db/types";

export const historyCopy = {
  title: "History",
  weekKicker: "This week",
  empty: "Nothing logged yet",
  emptyHint: "Finish a workout or log cardio and it shows up here.",
  dayAria: (date: string, logged: boolean): string =>
    `${date} — ${logged ? "session logged" : "no session"}`,
  liftTitle: (group: string | null): string =>
    group === null ? "Workout" : `${group} Day`,
  liftDetail: (weekday: string, durationMin: number, sets: number): string =>
    `${weekday} · ${durationMin} min · ${sets} ${sets === 1 ? "set" : "sets"}`,
  cardioDetail: (
    weekday: string,
    distanceKm: number | null,
    durationMin: number,
  ): string =>
    distanceKm === null
      ? `${weekday} · ${durationMin} min`
      : `${weekday} · ${distanceKm.toFixed(1)} km · ${durationMin} min`,
} as const;

export const cardioTitle: Record<CardioModality, string> = {
  walk: "Walk",
  run: "Run",
  treadmill: "Treadmill",
};
