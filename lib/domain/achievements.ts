// Pure achievement detection. Slugs here must match the seeded rows in
// the `achievements` table. Criteria are hardcoded; the jsonb column is
// informational (for future UI copy / progress bars).

export const ACHIEVEMENT_SLUGS = [
  "first_workout",
  "ten_workouts",
  "fifty_workouts",
  "streak_week",
  "first_pr",
  "ten_prs",
  "full_body_week",
  "volume_10k",
] as const;

export type AchievementSlug = (typeof ACHIEVEMENT_SLUGS)[number];

export type AchievementStats = {
  workoutsFinished: number;
  streakDays: number;
  prCount: number;
  muscleGroupsThisWeek: number;
  lifetimeVolume: number;
};

const rules: Record<AchievementSlug, (s: AchievementStats) => boolean> = {
  first_workout: (s) => s.workoutsFinished >= 1,
  ten_workouts: (s) => s.workoutsFinished >= 10,
  fifty_workouts: (s) => s.workoutsFinished >= 50,
  streak_week: (s) => s.streakDays >= 7,
  first_pr: (s) => s.prCount >= 1,
  ten_prs: (s) => s.prCount >= 10,
  full_body_week: (s) => s.muscleGroupsThisWeek >= 6,
  volume_10k: (s) => s.lifetimeVolume >= 10_000,
};

export const detectUnlocks = (
  stats: AchievementStats,
  alreadyUnlocked: readonly AchievementSlug[],
): AchievementSlug[] => {
  const unlocked = new Set<AchievementSlug>(alreadyUnlocked);
  const out: AchievementSlug[] = [];
  for (const slug of ACHIEVEMENT_SLUGS) {
    if (unlocked.has(slug)) continue;
    if (rules[slug](stats)) out.push(slug);
  }
  return out;
};
