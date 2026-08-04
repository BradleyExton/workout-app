import type { CardioModality } from "@/lib/db/types";

export const historyEntryCopy = {
  liftTitle: (group: string | null): string =>
    group === null ? "Workout" : `${group} Day`,
  liftDetail: (day: string, durationMin: number, sets: number): string =>
    `${day} · ${durationMin} min · ${sets} ${sets === 1 ? "set" : "sets"}`,
  cardioDetail: (
    day: string,
    distanceKm: number | null,
    durationMin: number,
  ): string =>
    distanceKm === null
      ? `${day} · ${durationMin} min`
      : `${day} · ${distanceKm.toFixed(1)} km · ${durationMin} min`,

  statVolume: "Volume kg",
  statExercises: "Exercises",
  statStarted: "Started",
  statDistance: "Distance",
  statTime: "Time",
  statPace: "Pace",

  km: (value: number): string => `${value.toFixed(1)} km`,
  minutes: (value: number): string => `${value} min`,
  pace: (value: string): string => `${value} /km`,

  setCount: (count: number): string =>
    `${count} ${count === 1 ? "set" : "sets"}`,
  setLegend: "Each chip is one set — weight × reps.",
  // Shown, not corrected. The stored duration is what it is; this says
  // out loud that it probably measures a forgotten timer rather than
  // time under the bar. New sessions stop the clock at the last set.
  suspectDuration:
    "Unusually long for a lift — the timer used to keep counting after the last set, so this session was probably just left running. The sets below are accurate either way.",
  unnamedExercise: "Exercise",
  noExercises: "No sets were logged in this workout.",
  noDistance: "No distance logged for this session.",
  close: "Close",
} as const;

export const cardioTitle: Record<CardioModality, string> = {
  walk: "Walk",
  run: "Run",
  treadmill: "Treadmill",
};
