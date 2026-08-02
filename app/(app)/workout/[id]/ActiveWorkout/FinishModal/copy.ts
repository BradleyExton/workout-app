export const finishModalCopy = {
  kicker: "Wrap-up",
  title: "END\nWORKOUT?",
  closeLabel: "Close",
  statTime: "Time",
  statSets: "Sets",
  statVolume: "Volume",
  finishAndSave: "FINISH & SAVE →",
  discard: "Discard workout",
  discardConfirmBody: (sets: number): string =>
    `Delete ${sets} logged ${sets === 1 ? "set" : "sets"}? This can't be undone.`,
  discardConfirmCta: "YES, DELETE WORKOUT",
  discardCancel: "Keep training",
  discarding: "Deleting…",
  discardEmpty: "DISCARD EMPTY WORKOUT",
  saveEmpty: "Save it anyway",
  saving: "Saving...",
  savingAria: "Saving workout",
  drainFailed:
    "Couldn't sync with server — your data is saved locally and will sync next time you're online.",
  continueOffline: "CONTINUE →",
} as const;
