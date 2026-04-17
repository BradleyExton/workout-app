export const base = "disabled:opacity-50 disabled:cursor-not-allowed";

export const variant = {
  primary:
    "w-full brutalist-md bg-ink text-lime py-4 display text-lg flex items-center justify-center gap-2",
  secondary:
    "border-[2px] border-ink rounded-lg bg-white text-ink px-3 py-1.5 font-black text-xs uppercase tracking-widest",
  dashed:
    "w-full border-[2px] border-dashed border-ink rounded-lg py-3 font-black text-xs uppercase tracking-widest text-ink",
  destructive:
    "w-full py-2 font-black text-xs uppercase tracking-widest text-urgent",
} as const;
