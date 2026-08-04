export const page = "flex min-h-dvh flex-col px-4 pt-5 pb-24 gap-4";
export const srTitle = "sr-only";
export const srOnly = "sr-only";

/* ---- identity header ---- */
export const identity = "flex items-center gap-3.5";
export const avatar =
  "w-[76px] h-[76px] flex-shrink-0 rounded-3xl bg-gradient-to-br from-plasma-pink to-plasma-violet shadow-glow-plasma flex items-center justify-center";
export const avatarMonogram = "display text-3xl leading-none text-glow";
export const identityText = "min-w-0 flex flex-col gap-0.5";
export const name = "display text-xl leading-tight truncate";
export const email = "text-[11px] font-semibold text-dust break-all";
export const since = "text-[11px] font-semibold text-dust-dim";

/* ---- next badge (the slot the fake XP bar used to hold) ----
 * Gold, because a badge is a reward — same accent the trophy case carries. */
export const nextBlock = "flex flex-col gap-1.5 mt-1";
export const nextLabelRow = "flex items-center justify-between kicker text-dust";
export const nextValue = "text-gold tabular-nums";
export const nextTarget = "flex items-center gap-2 min-w-0";
export const nextIcon = "text-base leading-none";
export const nextName = "text-sm font-extrabold leading-tight truncate";
// The "every badge unlocked" line is a sentence, not a title — let it wrap.
export const nextNameDone = "text-sm font-extrabold leading-tight text-balance";
export const nextTrack =
  "h-2.5 rounded-full border border-edge bg-void/60 overflow-hidden";
export const nextFill = "h-full rounded-full bg-gold shadow-glow-gold";
export const nextCondition = "text-[11px] font-semibold text-dust";
export const nextNote = "text-[10px] font-semibold text-dust-dim";

/* ---- stat tiles ---- */
export const statsRow = "grid grid-cols-3 gap-2";
export const statCard = "p-2.5 text-center";
export const statLabel =
  "text-[9px] font-extrabold uppercase tracking-wider text-dust";
export const statValue =
  "display text-2xl mt-0.5 leading-none text-pulse [text-shadow:0_0_12px_rgba(38,240,229,0.5)]";
// A zero is information, not an achievement — no pulse, no glow.
export const statValueZero =
  "display text-2xl mt-0.5 leading-none text-dust-dim";

/* ---- trophy case ----
 * Two columns: names and unlock conditions need the width, and a bare emoji
 * grid told sighted users nothing about what a badge was. */
export const trophyCard = "p-4";
export const trophyKicker = "kicker text-gold";
export const trophyGrid = "grid grid-cols-2 gap-2 mt-3 list-none";
export const tileBase =
  "rounded-xl border p-2.5 flex flex-col items-center text-center gap-1.5";
export const tileUnlocked = "border-plasma-violet/50 bg-plasma-violet/10";
// The freshest reward gets the gold ring, matching Home's "latest loot".
export const tileLatest = "border-gold/60 bg-gold/10";
export const tileLocked = "border-edge bg-void/40";
export const medalBase =
  "w-10 h-10 rounded-full flex items-center justify-center text-lg leading-none flex-shrink-0";
export const medalUnlocked =
  "border-[1.5px] border-plasma-violet bg-gradient-to-br from-plasma-violet/35 to-panel shadow-glow-plasma";
export const medalLatest =
  "border-[1.5px] border-gold bg-gradient-to-br from-gold/20 to-panel shadow-glow-gold";
export const medalLocked = "border-[1.5px] border-edge bg-panel";
export const badgeLockIcon = "w-4 h-4 text-dust-dim";
export const badgeName =
  "text-[11px] font-extrabold uppercase tracking-wide leading-tight text-balance";
export const badgeNameLocked =
  "text-[11px] font-extrabold uppercase tracking-wide leading-tight text-balance text-dust";
export const badgeCondition =
  "text-[10px] font-semibold leading-snug text-dust-dim text-balance";
export const trophyEmpty = "text-xs font-semibold text-dust mt-3";

/* ---- sign out ---- */
export const signOutZone = "mt-auto pt-4";
