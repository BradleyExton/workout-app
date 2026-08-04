// Full-screen takeover, above the tab bar; repeats the body's nebula
// gradient so the celebration doesn't sit on flat void.
export const screen =
  "fixed inset-0 z-50 overflow-y-auto bg-void [background-image:radial-gradient(120%_60%_at_50%_-10%,#2a1550_0%,transparent_60%)]";
export const inner =
  "flex min-h-full w-full max-w-md mx-auto flex-col gap-3 px-4 pt-10 pb-8";

// mt-auto here + mt-auto on the CTA splits the leftover space evenly, so
// a short summary floats centered instead of hugging the top with a void
// below it.
export const burst = "text-center py-6 mt-auto";
export const burstKicker =
  "kicker text-pulse [text-shadow:0_0_14px_rgba(38,240,229,0.6)]";
export const burstTitle = "display text-5xl leading-tight mt-2";
export const burstSummary = "text-sm font-semibold text-dust mt-1";

export const breakdownCard = "card-volt px-4 py-1.5";
export const breakdownRow =
  "flex justify-between py-2.5 border-b border-edge/60 last:border-b-0 text-sm font-semibold text-dust";
export const breakdownValue = "font-extrabold text-glow tabular-nums";

export const prCard = "card-volt p-3 flex flex-col gap-2";
export const prRow = "flex items-center gap-2";
export const prTag =
  "kicker rounded-full border border-pulse/40 px-2 py-0.5 text-pulse flex-shrink-0";
export const prBody = "text-sm font-bold flex-1 truncate";

// Gold = rewards. Explicit classes instead of card-volt so border-gold
// doesn't collide with card-volt's border-edge.
export const badgeRow =
  "rounded-2xl border border-gold/40 bg-panel shadow-glow-gold px-3.5 py-3 flex items-center gap-3";
export const badgeCoin =
  "w-12 h-12 rounded-full border border-gold bg-void/40 shadow-glow-gold flex items-center justify-center flex-shrink-0";
export const badgeGlyph = "w-6 h-6";
export const badgeKicker = "kicker text-gold";
export const badgeTitle = "text-sm font-extrabold leading-tight mt-0.5";

export const cta = "mt-auto pt-4";
