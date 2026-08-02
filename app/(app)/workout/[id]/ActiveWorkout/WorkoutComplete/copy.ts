export const workoutCompleteCopy = {
  kicker: "Workout complete",
  // TODO(xp): the headline becomes the workout's total XP payout
  // ("+330 XP") once the XP economy lands.
  title: "NICE WORK",
  summary: (durationMin: number, sets: number): string =>
    `${durationMin} min · ${sets} ${sets === 1 ? "set" : "sets"}`,
  breakdownSets: "Sets",
  breakdownDuration: "Duration",
  breakdownVolume: "Volume",
  durationValue: (durationMin: number): string => `${durationMin} min`,
  newPrLabel: "NEW PR",
  prExtra: (n: number): string => `(+${n} more)`,
  badgeDropKicker: "Badge drop",
  continueCta: "CONTINUE",
  prTypeLabel: {
    "1rm": "1RM",
    volume: "VOL",
    reps: "REPS",
  },
} as const;
