export const md = "card-volt";
export const sm = "card-volt-sm";

// panel and muted are both panel surfaces — differentiation comes from
// content, not card color. plasma is the identity/action surface.
export const variant = {
  panel: "text-glow",
  plasma:
    "bg-gradient-to-br from-plasma-pink to-plasma-violet border-transparent text-glow",
  muted: "bg-panel/60 text-dust",
} as const;
