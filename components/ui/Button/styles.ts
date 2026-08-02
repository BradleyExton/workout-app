export const base = "disabled:opacity-50 disabled:cursor-not-allowed";

export const variant = {
  primary:
    "w-full rounded-2xl bg-gradient-to-r from-plasma-pink to-plasma-violet text-glow shadow-glow-plasma py-4 display text-base uppercase tracking-wide flex items-center justify-center gap-2",
  secondary:
    "border border-edge rounded-full bg-panel text-dust px-4 py-1.5 font-extrabold text-xs uppercase tracking-widest",
  dashed:
    "w-full border border-dashed border-edge rounded-xl py-3 font-extrabold text-xs uppercase tracking-widest text-dust",
  destructive:
    "w-full py-2 font-extrabold text-xs uppercase tracking-widest text-plasma-pink",
} as const;
