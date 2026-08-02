// Week strip: one cell per day. A logged day is a plasma-gradient cell —
// plasma is the identity accent, so the glow belongs to it.
export const weekBlock = "flex flex-col gap-1.5";
export const weekKicker = "kicker text-dust";
export const weekStrip = "flex gap-1.5";
export const weekCellBase =
  "flex-1 h-9 rounded-lg flex items-center justify-center text-[9.5px] font-extrabold uppercase";
export const weekCellIdle = "border border-edge bg-panel text-dust-dim";
export const weekCellHit =
  "bg-gradient-to-br from-plasma-pink to-plasma-violet text-glow shadow-glow-plasma";

// Month kicker: a big display heading that breaks the feed into groups.
export const monthGroup = "flex flex-col gap-2";
export const monthHeading = "display text-2xl leading-none mt-2";
export const monthYear = "text-dust-dim";

export const entryList = "flex flex-col gap-2";

export const emptyBlock = "flex flex-col items-center gap-1.5 py-10 text-center";
export const emptyText = "display text-lg";
export const emptyHint = "text-xs font-semibold text-dust-dim";
export const emptyCta = "mt-4 max-w-xs";
