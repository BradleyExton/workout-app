// Volume display for set totals. Smooths the 999 -> 1.0k boundary.
//   < 1000   -> whole ("825")
//   < 10000  -> one decimal ("4.2k")
//   >= 10000 -> whole k ("12k")
export const formatVolume = (volume: number): string => {
  if (volume < 1000) return Math.round(volume).toString();
  if (volume < 10_000) return `${(volume / 1000).toFixed(1)}k`;
  return `${Math.round(volume / 1000)}k`;
};
