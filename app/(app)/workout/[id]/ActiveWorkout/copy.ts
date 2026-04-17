export const activeWorkoutCopy = {
  back: "← Back",
  finish: "Finish",
  emptyHint: "No exercises yet. Tap Add Exercise.",
  currentSetLabel: (n: number): string => `SET ${n}`,
  setRowCheck: "✓",
  logSet: "LOG SET →",
  lastSessionPrefix: "Last session ·",
  sessionLabel: "Session",
  statVolume: "Volume",
  statSets: "Sets",
  statExercises: "Exercises",
  todayLabel: "Today",
  addExercise: "+ Add exercise",
} as const;

export const relativeDays = (iso: string): string => {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const days = Math.floor((now - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};
