const base =
  "fixed left-0 right-0 px-4 pt-7 pb-4 bg-gradient-to-b from-transparent via-void/95 to-void pointer-events-none";

// 3.5rem is the offset home has always used: the bar itself measures a
// little more (~64px), but the strip's own pb-4 is gradient, not control, so
// the button still lands clear of it. The bar sits on the safe-area inset,
// so this offset has to clear that too.
export const zoneAboveTabBar = `${base} bottom-[calc(3.5rem+env(safe-area-inset-bottom))]`;
// No bar on this route — the CTA sits on the safe area itself.
export const zone = `${base} bottom-[env(safe-area-inset-bottom)]`;

// The strip swallows taps everywhere except on the control itself, so the
// gradient never eats a tap meant for the content scrolling under it.
export const inner = "pointer-events-auto";
