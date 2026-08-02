import type { CardioModality } from "@/lib/db/types";

export const cardioFormCopy = {
  back: "← Back",
  title: "LOG CARDIO",
  modalityLabel: "Activity",
  distanceLabel: "Distance",
  distanceUnit: "km",
  durationLabel: "Duration",
  durationUnit: "min",
  submit: "LOG CARDIO →",
  saving: "SAVING…",
  doneTitle: "LOGGED ✓",
  doneSummary: (
    modality: string,
    distanceKm: number | null,
    durationMin: number,
  ): string =>
    distanceKm !== null
      ? `${modality} · ${distanceKm} km · ${durationMin} min`
      : `${modality} · ${durationMin} min`,
  errorDuration: "Duration is required (at least 1 min).",
  errorDistance: "Distance must be 0 or more.",
} as const;

export const modalityLabel: Record<CardioModality, string> = {
  walk: "Walk",
  run: "Run",
  treadmill: "Treadmill",
};
