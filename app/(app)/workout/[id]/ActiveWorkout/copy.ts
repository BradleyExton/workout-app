export const activeWorkoutCopy = {
  back: "← Back",
  finish: "Finish",
  emptyHint: "No exercises yet. Tap Add Exercise.",
  currentSetLabel: (n: number, of?: number): string =>
    of ? `SET ${n} OF ${of}` : `SET ${n}`,
  setRowCheck: "✓",
  progressLabel: "Exercise progress",
  progressPct: (pct: number): string => `${pct}%`,
  // TODO(xp): append the set's XP payout ("Complete set · +20 XP") once
  // the XP economy phase lands.
  logSet: "COMPLETE SET",
  lastSessionPrefix: "Last session ·",
  prLabel: "Personal records",
  pr1rm: "1RM",
  prVolume: "VOL",
  prReps: "REPS",
  newPr: "NEW PR",
  sessionLabel: "Session",
  statVolume: "Volume",
  statSets: "Sets",
  statExercises: "Exercises",
  todayLabel: "Today",
  addExercise: "+ Add exercise",
} as const;
