export const md = "card-volt";
export const sm = "card-volt-sm";

// Variant names are legacy (from the brutalist system) until every call
// site migrates; the values are Volt. white/cream/black are all panel
// surfaces now — differentiation comes from content, not card color.
export const variant = {
  white: "text-glow",
  lime: "bg-gradient-to-br from-plasma-pink to-plasma-violet border-transparent text-glow",
  black: "text-glow",
  cream: "bg-panel/60 text-dust",
  urgent: "bg-gradient-to-br from-plasma-pink to-plasma-violet border-transparent text-glow",
} as const;
