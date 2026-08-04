// Logged weights are user-entered (at most quarter-kilo steps), but they
// travel through arithmetic — round to 2 decimals so a float tail can
// never render as "11.666666666666666".
export const formatWeight = (weight: number): string =>
  String(Math.round(weight * 100) / 100);

// Estimated 1RM (Epley) carries no real precision beyond a tenth of a
// kilo — "11.67" reads as fake exactness. One decimal, trailing zero
// stripped ("11.7", "120").
export const formatOneRm = (weight: number): string =>
  String(Math.round(weight * 10) / 10);
