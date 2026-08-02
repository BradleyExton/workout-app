export const historyFeedCopy = {
  weekKicker: "This week",
  empty: "Nothing logged yet",
  emptyHint: "Finish a workout or log cardio and it shows up here.",
  emptyCta: "Start workout",
  dayAria: (date: string, logged: boolean): string =>
    `${date} — ${logged ? "session logged" : "no session"}`,
} as const;
