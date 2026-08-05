export const md = "flex gap-1";
export const sm = "flex gap-0.5";

// A pip that lights up is a small reward, so it fades and glows in rather
// than repainting. It transitions rather than animates because incrementing
// `filled` only swaps the class on an existing pip — React keeps the node,
// so a keyframe would never re-fire.
export const pipMd = "h-2 flex-1 rounded-sm settles";
export const pipSm = "h-1.5 flex-1 rounded-sm settles";

// Pulse cyan = live progress, per the Volt accent rules. The tones exist
// for panel vs gradient surfaces; both grounds are dark now.
export const filled = {
  onLight: "bg-pulse shadow-glow-pulse",
  onDark: "bg-glow",
} as const;

export const unfilled = {
  onLight: "bg-glow/10",
  onDark: "bg-glow/20",
} as const;
