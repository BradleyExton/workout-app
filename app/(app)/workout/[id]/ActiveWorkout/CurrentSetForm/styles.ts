// The live set gets the cyan treatment — pulse border + glow marks
// "whatever is live right now". Not card-volt: its border-edge would
// collide with border-pulse.
export const card =
  "rounded-2xl border border-pulse bg-panel shadow-glow-pulse p-4";
export const header = "flex items-center gap-2 mb-3";
export const setNumber =
  "display text-lg w-7 text-center text-pulse [text-shadow:0_0_12px_rgba(38,240,229,0.5)]";
export const label = "kicker text-pulse";

export const grid = "grid grid-cols-2 gap-2";
export const field =
  "rounded-xl border border-edge bg-void/40 p-3 flex flex-col items-center gap-1";
export const fieldLabel = "text-[9px] font-extrabold uppercase text-dust";
export const input =
  "display text-3xl w-full text-center bg-transparent text-glow placeholder:text-dust-dim outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
export const fieldUnit = "text-[10px] font-bold text-dust";

// Ring, not border: stacking a second border-color utility on `field`
// would conflict with border-edge.
export const fieldError = "ring-2 ring-plasma-pink";
export const errorText =
  "text-xs font-extrabold text-plasma-pink mt-2 text-center";
