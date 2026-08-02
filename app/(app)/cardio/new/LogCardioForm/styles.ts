export const page = "flex min-h-dvh flex-col gap-4 px-4 pt-4 pb-44";
export const back = "self-start kicker text-dust px-2 py-1.5";
export const title = "display text-3xl leading-none";

export const sectionLabel = "kicker text-dust";

export const chipRow = "flex gap-2";
export const chipBase =
  "flex-1 rounded-full py-2 text-xs font-extrabold uppercase tracking-widest";
export const chipActive =
  "bg-gradient-to-r from-plasma-pink to-plasma-violet text-glow shadow-glow-plasma";
export const chipIdle = "border border-edge text-dust";

export const fieldGrid = "grid grid-cols-2 gap-2";
export const field =
  "card-volt-sm bg-panel p-3 flex flex-col items-center gap-1";
export const fieldLabel = "text-[9px] font-extrabold uppercase text-dust";
export const input =
  "display text-3xl w-full text-center bg-transparent text-glow outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
export const fieldUnit = "text-[10px] font-bold text-dust";

// The time row only exists once "Earlier"/"Yesterday" is picked, so it reads
// horizontally — label left, value right — rather than stacking like the
// number fields and pushing the CTA further down.
export const timeField =
  "card-volt-sm bg-panel px-3 py-2.5 flex items-center justify-between gap-3";
// color-scheme:dark keeps the native time picker (and WebKit's own AM/PM
// affordance) on the dark palette instead of a white system sheet.
export const timeInput =
  "display text-2xl text-glow bg-transparent outline-none text-right [color-scheme:dark] [&::-webkit-date-and-time-value]:text-right";

export const ctaZone =
  "fixed left-0 right-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] px-4 pt-7 pb-4 bg-gradient-to-b from-transparent via-void/95 to-void pointer-events-none";
export const ctaInner = "pointer-events-auto";

export const doneCard =
  "w-full rounded-full border border-pulse/40 bg-pulse/15 py-3 flex items-center justify-center gap-2";
export const doneTitle = "text-pulse text-sm font-extrabold tracking-widest";
export const doneSummary = "text-xs font-bold text-dust";

// Ring, not border: a second border-color utility would conflict with
// card-volt-sm's border-edge.
export const fieldError = "ring-2 ring-plasma-pink";
export const errorText = "text-xs font-extrabold text-plasma-pink text-center";
