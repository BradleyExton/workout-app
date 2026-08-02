export const entryCard = "p-0 overflow-hidden";
export const entryHeader =
  "w-full p-3 flex items-center gap-3 text-left active:scale-[0.99] transition-transform";

export const entryIconBase =
  "w-10 h-10 flex-shrink-0 rounded-xl border flex items-center justify-center";
export const entryIconLift =
  "border-plasma-pink/40 bg-plasma-pink/10 text-plasma-pink";
export const entryIconCardio = "border-pulse/40 bg-pulse/10 text-pulse";
export const entryIcon = "w-5 h-5";

export const entryBody = "flex-1 min-w-0 flex flex-col";
export const entryTitle = "display text-sm leading-tight";
export const entryDetail = "text-[11px] font-semibold text-dust mt-0.5";

export const chevron =
  "w-4 h-4 flex-shrink-0 text-dust-dim transition-transform duration-150";
export const chevronOpen = `${chevron} rotate-180`;

/* ---- expanded panel ---- */
export const panel =
  "px-3 pb-3 pt-2.5 border-t border-edge flex flex-col gap-3";

export const statRow = "flex flex-wrap gap-x-5 gap-y-2";
export const stat = "flex flex-col";
export const statLabel = "kicker text-dust-dim";
export const statValue = "display text-base leading-none mt-1 tabular-nums";

export const exerciseList = "flex flex-col gap-2.5";
export const exerciseBlock = "flex flex-col gap-1.5";
export const exerciseHead = "flex items-baseline justify-between gap-2";
export const exerciseName = "display text-xs uppercase tracking-wide truncate";
export const exerciseMeta =
  "text-[10px] font-bold text-dust-dim flex-shrink-0";
// One chip per set. Pulse reads "this is logged work", and a wrapping row
// keeps a 25-set session from turning the card into a scroll tunnel.
export const setPills = "flex flex-wrap gap-1.5";
export const setPill =
  "rounded-full border border-pulse/30 bg-pulse/10 text-pulse px-2.5 py-1 text-[11px] font-extrabold tabular-nums";

export const panelNote = "text-[10px] font-semibold text-dust-dim";

export const closeBtn =
  "self-stretch rounded-full border border-edge text-dust py-2 text-[10px] font-extrabold uppercase tracking-widest";
