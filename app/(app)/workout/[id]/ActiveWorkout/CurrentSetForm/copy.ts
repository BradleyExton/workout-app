export const currentSetCopy = {
  currentSetLabel: "Current Set",
  weightLabel: "Weight",
  weightUnit: "kg",
  // Only visible on a brand-new exercise (no last-session prefill): a
  // ghost zero marks the empty tile as an input, not a blank.
  weightPlaceholder: "0",
  repsLabel: "Reps",
  repsUnit: "reps",
  repsPlaceholder: "0",
  submit: "LOG SET →",
  errorWeight: "Weight must be 0 or more.",
  errorWeightMax: "Weight looks too high — max 500 kg.",
  errorReps: "Reps must be a whole number, 1 or more.",
  errorRepsMax: "Reps look too high — max 100.",
} as const;
