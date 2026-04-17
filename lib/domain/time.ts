const MS_PER_DAY = 86_400_000;

export const isoDaysAgo = (days: number): string =>
  new Date(Date.now() - days * MS_PER_DAY).toISOString();

export const currentDate = (): Date => new Date();
