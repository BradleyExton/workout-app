export const setListCopy = {
  synced: "✓",
  syncedLabel: "Synced",
  pending: "⏳",
  pendingLabel: "Pending sync",
  pendingLegend: "⏳ = saved on this phone — syncs when you're back online.",
  newPr: "NEW PR",
  rowLabel: (n: number, weight: string, reps: number): string =>
    `Set ${n} — ${weight} kg × ${reps}. Tap to edit.`,
  weightLabel: "Weight (kg)",
  repsLabel: "Reps",
  save: "Save",
  delete: "Delete",
  deleteConfirm: "Really delete?",
  errorWeight: "Weight must be 0 or more.",
  errorWeightMax: "Weight looks too high — max 500 kg.",
  errorReps: "Reps must be a whole number, 1 or more.",
  errorRepsMax: "Reps look too high — max 100.",
} as const;
