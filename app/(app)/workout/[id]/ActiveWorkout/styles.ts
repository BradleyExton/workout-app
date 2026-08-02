// pb clears the fixed CTA strip only — no tab bar renders on /workout/*.
export const page = "flex min-h-dvh flex-col gap-3 px-4 pb-30 pt-4";

export const topBar = "flex items-center justify-between";
export const back = "kicker text-dust px-2 py-1.5";
export const timerPill =
  "flex items-center gap-2 rounded-full border border-pulse/40 bg-panel px-3 py-1.5 text-pulse";
export const timerDot = "w-2 h-2 rounded-full bg-pulse shadow-glow-pulse";
export const timerText = "display text-sm tabular-nums";
// Paused: pulse means "live", so a stopped clock must give the colour up
// entirely rather than wear it dimmed.
export const timerPillPaused =
  "flex items-center gap-2 rounded-full border border-edge bg-panel px-3 py-1.5 text-dust";
export const timerDotPaused = "w-2 h-2 rounded-full bg-dust-dim";
export const timerPausedLabel = "text-[9px] font-extrabold uppercase tracking-widest text-dust-dim";
export const finishBtn =
  "border border-edge rounded-full bg-panel text-dust px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest disabled:opacity-50";

export const hero = "p-4";
export const heroRow = "flex items-center justify-between";
// Plain text, not a pill: a chip reading "BACK" directly under the
// "← Back" nav link reads as a second back button.
export const groupBadge = "kicker opacity-80";
export const setLabel = "text-[10px] font-extrabold tracking-widest";
export const exerciseName = "display text-3xl leading-none mt-2";

export const progressBlock = "mt-1";
export const progressLabelRow =
  "flex items-center justify-between kicker text-dust mb-1.5";
export const progressTrack =
  "h-3 rounded-full border border-edge bg-void/60 overflow-hidden";
export const progressFill =
  "h-full rounded-full bg-gradient-to-r from-plasma-pink via-plasma-violet to-pulse";

export const lastSessionCard = "p-3";
export const lastSessionHeader = "flex items-center justify-between mb-2";
export const lastSessionLabel = "kicker";
export const lastSessionPills = "flex gap-1.5 flex-wrap";
export const lastSessionPill =
  "rounded-full border border-edge bg-panel px-2.5 py-1 text-xs font-bold text-glow tabular-nums";

export const prRow = "mt-2 pt-2 border-t border-edge";
export const prLabel = "kicker mb-2";
export const prPills = "flex gap-1.5 flex-wrap";
export const prPill =
  "rounded-full border border-pulse/40 px-2.5 py-1 text-xs font-bold text-pulse flex items-center gap-1 tabular-nums";
export const prPillKey = "text-[9px] opacity-70";
export const prPillValue = "font-extrabold";

export const setList = "flex flex-col gap-2";

export const statsCard = "p-3";
export const statsLabel = "kicker mb-2";
export const statsGrid = "grid grid-cols-3 gap-2 text-center";
export const statValue =
  "display text-xl leading-none text-pulse [text-shadow:0_0_12px_rgba(38,240,229,0.5)]";
export const statKey = "text-[9px] font-extrabold uppercase text-dust mt-1";

export const todaySection = "mt-1";
export const todayLabel = "kicker text-dust mb-2";
export const todayList = "flex flex-col gap-2";
export const todayRow =
  "card-volt-sm w-full px-3 py-2.5 flex items-center gap-2 text-left active:scale-[0.98] transition-transform";
export const todayName = "font-extrabold text-sm flex-1";
export const todayStats = "text-[10px] font-bold text-dust";
export const todayChevron = "text-dust font-extrabold text-lg leading-none";
export const addExerciseBtn =
  "mt-2 block w-full border border-dashed border-edge rounded-xl py-3 text-xs font-extrabold uppercase tracking-widest text-dust text-center";

export const empty = "text-sm font-semibold text-dust text-center pt-8";
export const emptyBlock = "flex flex-col gap-4 px-2";
