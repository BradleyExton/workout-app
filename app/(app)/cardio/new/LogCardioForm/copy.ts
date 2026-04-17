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
} as const;

export const modalityLabel: Record<CardioModality, string> = {
  walk: "Walk",
  run: "Run",
  treadmill: "Treadmill",
};
