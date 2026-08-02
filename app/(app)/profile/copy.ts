import type { AchievementMetric } from "@/lib/domain/achievements";

// Phrasing lives here, the numbers come from ACHIEVEMENT_REQUIREMENTS — the
// threshold is never retyped in copy, so it can't drift from the real rule.
const conditionByMetric: Record<AchievementMetric, (n: number) => string> = {
  workoutsFinished: (n) =>
    n === 1 ? "Finish your first workout" : `Finish ${n} workouts`,
  streakDays: (n) => `Train ${n} days in a row`,
  prCount: (n) =>
    n === 1 ? "Set your first personal record" : `Set ${n} personal records`,
  muscleGroupsThisWeek: (n) => `Hit all ${n} muscle groups in one week`,
  lifetimeVolume: (n) => `Lift ${n.toLocaleString("en-US")} kg all time`,
};

export const profileCopy = {
  title: "Profile",
  fallbackName: "Athlete",
  playingSince: (when: string): string => `Playing since ${when}`,
  nextBadgeKicker: "Next badge",
  nextBadgeProgress: (current: number, threshold: number): string =>
    `${current} / ${threshold}`,
  nextBadgeAllDone: "Every badge unlocked. Nothing left to chase.",
  nextBadgeAllDoneIcon: "🏆",
  xpSoonNote: "XP and levels arrive in a later update.",
  statWorkouts: "Workouts · all time",
  statCardio: "Cardio · all time",
  statBadges: "Badges",
  trophyCase: (unlocked: number, total: number): string =>
    `Trophy case · ${unlocked} / ${total}`,
  trophyEmpty: "No badges yet — finish a workout to open the case.",
  badgeUnlockedState: "Unlocked",
  badgeLockedState: "Locked",
  badgeCondition: (metric: AchievementMetric, threshold: number): string =>
    conditionByMetric[metric](threshold),
} as const;
