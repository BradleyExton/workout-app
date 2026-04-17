export const md = "flex gap-1";
export const sm = "flex gap-0.5";

export const pipMd = "h-2 flex-1 rounded-sm";
export const pipSm = "h-1.5 flex-1";

export const filled = {
  onLight: "bg-ink",
  onDark: "bg-white",
} as const;

export const unfilled = {
  onLight: "bg-ink/15",
  onDark: "bg-white/20",
} as const;
