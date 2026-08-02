export const profileCopy = {
  title: "Profile",
  fallbackName: "Athlete",
  levelKicker: "LV",
  playingSince: (when: string): string => `Playing since ${when}`,
  xpLabel: "Next level",
  xpValue: (current: number, next: number): string =>
    `${current} / ${next} XP`,
  xpPreviewNote: "Preview — XP tracking lands in a later update",
  statWorkouts: "Workouts · all time",
  statCardio: "Cardio · all time",
  statBadges: "Badges",
  trophyCase: (unlocked: number, total: number): string =>
    `Trophy case · ${unlocked} / ${total}`,
  trophyEmpty: "No badges yet — finish a workout to open the case.",
  badgeUnlockedLabel: (title: string): string => title,
  badgeLockedLabel: (title: string): string => `${title} — locked`,
} as const;
