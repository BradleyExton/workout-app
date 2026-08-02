export const syncChipCopy = {
  stuck: (n: number): string =>
    `${n} ${n === 1 ? "change" : "changes"} not synced — tap to retry`,
  retrying: "Retrying…",
} as const;
