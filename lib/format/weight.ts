export const formatWeight = (weight: number): string =>
  Number.isInteger(weight) ? String(weight) : weight.toString();
