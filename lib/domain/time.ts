const MS_PER_DAY = 86_400_000;

export const isoDaysAgo = (days: number): string =>
  new Date(Date.now() - days * MS_PER_DAY).toISOString();

export const currentDate = (): Date => new Date();

// Local-calendar keys. Anything the user reads as "a day" (the history
// week strip, month groups, "yesterday") has to line up with the day they
// actually trained, not with the UTC instant.
export const localDayKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export const localMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}`;

// Whole calendar days between two instants, times of day ignored — so a
// session at 11pm is "yesterday" at 1am the next morning, not "0 days".
export const calendarDaysBetween = (from: Date, to: Date): number => {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
};
