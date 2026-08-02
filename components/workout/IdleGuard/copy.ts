export const idleGuardCopy = {
  promptKicker: "Still training?",
  promptBody: (idleMin: number): string =>
    `No set logged in ${idleMin} min, so the clock is paused. It'll restart on your next set.`,
  stillGoing: "Still going",
  endWorkout: "End workout",

  savedKicker: "Workout saved",
  savedBody: (durationMin: number, setCount: number): string =>
    `${durationMin} min · ${setCount} ${setCount === 1 ? "set" : "sets"}.`,
  // Says the quiet part out loud: the recorded duration is shorter than
  // the wall clock, and here is exactly why.
  savedTrimmed: (trimmedMin: number): string =>
    ` Counted up to your last set — the ${trimmedMin} idle min after it weren't included.`,

  discardedKicker: "Empty workout cleared",
  discardedBody: "No sets were ever logged, so there was nothing to save.",

  dismiss: "Got it",
  dismissAria: "Dismiss",
} as const;
