// Pinned to the top, never the bottom. The active-workout screen owns the
// bottom of the viewport — the COMPLETE SET button sits above the tab bar
// — and a banner there would land under the user's thumb mid-set. Up here
// it can only ever overlap the back/timer/finish row, which carries no
// part of the set-logging flow.
//
// The top inset is not decoration: the sync-status chip floats at top-2
// and outranks this (z-50 vs z-40), so the card starts below it rather
// than letting a stuck-queue warning print itself over this message.
export const wrap =
  "fixed left-0 right-0 top-0 z-40 px-3 pt-[calc(2.75rem+env(safe-area-inset-top))] pointer-events-none";

const cardBase =
  "pointer-events-auto card-volt bg-panel/95 backdrop-blur-md p-3 flex flex-col gap-2.5";
// Pulse = "this is about the live session".
export const promptCard = `${cardBase} border-pulse/50`;
export const noticeCard = `${cardBase} border-edge`;

export const kicker = "display text-sm leading-none";
export const body = "text-[11px] font-semibold leading-snug text-dust";

export const actions = "flex items-center gap-2";
export const ackBtn =
  "flex-1 rounded-full bg-pulse text-void py-2 text-[10px] font-extrabold uppercase tracking-widest disabled:opacity-50";
export const endBtn =
  "flex-1 rounded-full border border-plasma-pink/50 bg-panel text-plasma-pink py-2 text-[10px] font-extrabold uppercase tracking-widest disabled:opacity-50";
export const dismissBtn =
  "self-stretch rounded-full border border-edge text-dust py-2 text-[10px] font-extrabold uppercase tracking-widest";
