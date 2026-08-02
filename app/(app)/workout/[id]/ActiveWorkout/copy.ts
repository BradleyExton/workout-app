export const activeWorkoutCopy = {
  back: "← Back",
  finish: "Finish",
  timerPaused: "Paused",
  emptyHint: "No exercises yet.",
  currentSetLabel: (n: number): string => `SET ${n}`,
  setRowCheck: "✓",
  // Honest framing: the bar compares against last session's set count,
  // not a prescribed plan.
  progressLabel: "Sets vs last session",
  progressValue: (done: number, target: number): string =>
    `${done} / ${target}`,
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
  todayRowLabel: (name: string): string => `Switch back to ${name}`,
  todaySetCount: (n: number): string => `${n} ${n === 1 ? "set" : "sets"}`,
  addExercise: "+ Add exercise",
} as const;
