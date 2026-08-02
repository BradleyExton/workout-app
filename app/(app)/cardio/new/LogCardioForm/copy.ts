import type { CardioModality } from "@/lib/db/types";
import type { WhenChoice } from "@/lib/domain/time";

export const cardioFormCopy = {
  back: "← Back",
  title: "LOG CARDIO",
  modalityLabel: "Activity",
  whenLabel: "When",
  distanceLabel: "Distance",
  distanceUnit: "km",
  durationLabel: "Duration",
  durationUnit: "min",
  timeFieldLabel: (when: Exclude<WhenChoice, "now">): string =>
    when === "yesterday" ? "Started yesterday at" : "Started today at",
  submit: "LOG CARDIO →",
  saving: "SAVING…",
  doneTitle: "LOGGED ✓",
  doneSummary: (
    modality: string,
    distanceKm: number | null,
    durationMin: number,
    when: string | null,
  ): string => {
    const parts = [modality];
    if (distanceKm !== null) parts.push(`${distanceKm} km`);
    parts.push(`${durationMin} min`);
    if (when !== null) parts.push(when);
    return parts.join(" · ");
  },
  // Echoed in the confirmation only when the session was backdated —
  // "Run · 5 km · 30 min" with no date already means "just now".
  doneWhen: (when: Exclude<WhenChoice, "now">, clock: string): string =>
    `${when === "yesterday" ? "Yesterday" : "Today"} ${clock}`,
  errors: {
    duration: "Duration is required (at least 1 min).",
    distance: "Distance must be 0 or more.",
    time: "Pick the time it started.",
    future: "That time hasn't happened yet. Pick an earlier one, or tap Yesterday.",
  },
} as const;

export const modalityLabel: Record<CardioModality, string> = {
  walk: "Walk",
  run: "Run",
  treadmill: "Treadmill",
};

export const whenLabel: Record<WhenChoice, string> = {
  now: "Just now",
  today: "Earlier",
  yesterday: "Yesterday",
};
