export const finishModalCopy = {
  kicker: "Wrap-up",
  title: "END\nWORKOUT?",
  closeLabel: "Close",
  statTime: "Time",
  statSets: "Sets",
  statVolume: "Volume",
  // Shown when the clock has stopped: the time above is smaller than the
  // wall clock, and the user gets told why before they save, not after.
  trimmedNote: (idleMin: number): string =>
    `Timer stopped at your last set — the ${idleMin} min since then aren't counted.`,
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
