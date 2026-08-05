export const base = "disabled:opacity-50 disabled:cursor-not-allowed";

// `settles` + `active:` live on the variants, not on `base`: several screens
// apply a variant string directly to a <Link> or <button> without going
// through <Button>, and press feedback should follow the look, not the
// component. Bigger surfaces give less — a full-width CTA at 0.98 travels
// as far in pixels as a chip at 0.94.
export const variant = {
  primary:
    "w-full rounded-2xl bg-gradient-to-r from-plasma-pink to-plasma-violet text-glow shadow-glow-plasma py-4 display text-base uppercase tracking-wide flex items-center justify-center gap-2 settles active:scale-[0.98]",
  // Pulse cyan = the live action (completing the current set), per the
  // one-job-per-accent rule.
  pulse:
    "w-full rounded-2xl bg-pulse text-void shadow-glow-pulse py-4 display text-base uppercase tracking-wide flex items-center justify-center gap-2 settles active:scale-[0.98]",
  secondary:
    "border border-edge rounded-full bg-panel text-dust px-4 py-1.5 font-extrabold text-xs uppercase tracking-widest settles active:scale-[0.94]",
  dashed:
    "w-full border border-dashed border-edge rounded-xl py-3 font-extrabold text-xs uppercase tracking-widest text-dust settles active:scale-[0.98]",
  destructive:
    "w-full py-2 font-extrabold text-xs uppercase tracking-widest text-plasma-pink settles active:opacity-70",
} as const;
