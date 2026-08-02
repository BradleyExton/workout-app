export const page = "flex min-h-dvh flex-col px-4 pt-5 pb-24 gap-4";
export const srTitle = "sr-only";

/* ---- identity header ---- */
export const identity = "flex items-center gap-3.5";
export const avatarWrap = "relative flex-shrink-0";
export const avatar =
  "w-[76px] h-[76px] rounded-3xl bg-gradient-to-br from-plasma-pink to-plasma-violet shadow-glow-plasma flex items-center justify-center";
export const avatarMonogram = "display text-3xl leading-none text-glow";
// Gold = XP & rewards, so the level chip (an XP derivative) carries gold.
export const levelChip =
  "absolute -bottom-1.5 -right-1.5 flex items-center gap-1 rounded-full border border-gold bg-void px-2 py-0.5 shadow-glow-gold";
export const levelKicker =
  "text-[8px] font-extrabold uppercase tracking-widest text-gold/80";
export const levelValue = "display text-xs leading-none text-gold";
export const identityText = "min-w-0 flex flex-col gap-0.5";
export const name = "display text-xl leading-tight truncate";
export const email = "text-[11px] font-semibold text-dust break-all";
export const since = "text-[11px] font-semibold text-dust-dim";

/* ---- XP progress ---- */
export const xpBlock = "flex flex-col gap-1.5 mt-1";
export const xpLabelRow = "flex items-center justify-between kicker text-dust";
export const xpValue = "text-gold tabular-nums";
export const xpTrack =
  "h-2.5 rounded-full border border-edge bg-void/60 overflow-hidden";
export const xpFill = "h-full rounded-full bg-gold shadow-glow-gold";
export const xpNote = "text-[10px] font-semibold text-dust-dim";

/* ---- stat tiles ---- */
export const statsRow = "grid grid-cols-3 gap-2";
export const statCard = "p-2.5 text-center";
export const statLabel =
  "text-[9px] font-extrabold uppercase tracking-wider text-dust";
export const statValue =
  "display text-2xl mt-0.5 leading-none text-pulse [text-shadow:0_0_12px_rgba(38,240,229,0.5)]";

/* ---- trophy case ---- */
export const trophyCard = "p-4";
export const trophyKicker = "kicker text-gold";
export const trophyGrid = "grid grid-cols-4 gap-2.5 justify-items-center mt-3";
export const badgeBase =
  "w-[54px] h-[54px] rounded-full flex items-center justify-center text-xl leading-none";
export const badgeUnlocked =
  "border-[1.5px] border-plasma-violet bg-gradient-to-br from-plasma-violet/35 to-panel shadow-glow-plasma";
// The freshest reward gets the gold ring, matching Home's "latest loot".
export const badgeLatest =
  "border-[1.5px] border-gold bg-gradient-to-br from-gold/20 to-panel shadow-glow-gold";
export const badgeLocked = "border-[1.5px] border-edge bg-panel opacity-40";
export const badgeLockIcon = "w-5 h-5 text-dust-dim";
export const trophyEmpty = "text-xs font-semibold text-dust mt-3";

/* ---- sign out ---- */
export const signOutZone = "mt-auto pt-4";
