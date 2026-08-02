export const ctaInner = "pointer-events-auto flex items-center justify-center gap-2";
export const resumeDot = "w-2.5 h-2.5 rounded-full bg-pulse shadow-glow-pulse";
// The dot claims "live". A paused clock isn't, so it loses the glow.
export const resumeDotPaused = "w-2.5 h-2.5 rounded-full bg-glow/40";
// Same box as a primary CTA (py-4 + text-base line-height), rendered
// empty while we work out whether the server's active workout is real.
export const ctaPlaceholder = "block w-full h-14";
