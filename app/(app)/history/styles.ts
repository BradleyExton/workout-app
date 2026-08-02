export const page = "flex min-h-dvh flex-col px-4 pt-5 pb-24 gap-4";
export const title = "display text-3xl leading-none";

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
export const entryRow = "p-3 flex items-center gap-3";
export const entryIconBase =
  "w-10 h-10 flex-shrink-0 rounded-xl border flex items-center justify-center";
export const entryIconLift =
  "border-plasma-pink/40 bg-plasma-pink/10 text-plasma-pink";
export const entryIconCardio = "border-pulse/40 bg-pulse/10 text-pulse";
export const entryIcon = "w-5 h-5";
export const entryBody = "flex-1 min-w-0";
export const entryTitle = "display text-sm leading-tight";
export const entryDetail = "text-[11px] font-semibold text-dust mt-0.5";

export const emptyBlock = "flex flex-col items-center gap-1.5 py-10 text-center";
export const emptyText = "display text-lg";
export const emptyHint = "text-xs font-semibold text-dust-dim";
