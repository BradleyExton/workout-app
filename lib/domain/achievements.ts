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

export type AchievementMetric = keyof AchievementStats;

export type AchievementRequirement = {
  metric: AchievementMetric;
  threshold: number;
};

// The single source of truth for "what unlocks this". Both the unlock check
// below and any UI that tells the user what to aim for read these numbers,
// so a threshold change can't leave the copy describing the old rule.
export const ACHIEVEMENT_REQUIREMENTS: Record<
  AchievementSlug,
  AchievementRequirement
> = {
  first_workout: { metric: "workoutsFinished", threshold: 1 },
  ten_workouts: { metric: "workoutsFinished", threshold: 10 },
  fifty_workouts: { metric: "workoutsFinished", threshold: 50 },
  streak_week: { metric: "streakDays", threshold: 7 },
  first_pr: { metric: "prCount", threshold: 1 },
  ten_prs: { metric: "prCount", threshold: 10 },
  full_body_week: { metric: "muscleGroupsThisWeek", threshold: 6 },
  volume_10k: { metric: "lifetimeVolume", threshold: 10_000 },
};

export const isAchievementSlug = (value: string): value is AchievementSlug =>
  (ACHIEVEMENT_SLUGS as readonly string[]).includes(value);

export const detectUnlocks = (
  stats: AchievementStats,
  alreadyUnlocked: readonly AchievementSlug[],
): AchievementSlug[] => {
  const unlocked = new Set<AchievementSlug>(alreadyUnlocked);
  const out: AchievementSlug[] = [];
  for (const slug of ACHIEVEMENT_SLUGS) {
    if (unlocked.has(slug)) continue;
    const { metric, threshold } = ACHIEVEMENT_REQUIREMENTS[slug];
    if (stats[metric] >= threshold) out.push(slug);
  }
  return out;
};

export type AchievementProgress = {
  slug: AchievementSlug;
  metric: AchievementMetric;
  current: number;
  threshold: number;
  /** 0–1, clamped. */
  ratio: number;
};

// Stats are partial because not every caller can afford to measure every
// metric (lifetime volume means scanning every set). An unmeasured metric
// yields null rather than a made-up zero.
export const achievementProgress = (
  slug: AchievementSlug,
  stats: Partial<AchievementStats>,
): AchievementProgress | null => {
  const { metric, threshold } = ACHIEVEMENT_REQUIREMENTS[slug];
  const current = stats[metric];
  if (current === undefined) return null;
  return {
    slug,
    metric,
    current,
    threshold,
    ratio: Math.min(1, Math.max(0, current / threshold)),
  };
};

// The locked badge the user is closest to, among the metrics the caller
// could measure. Ties break on ACHIEVEMENT_SLUGS order (cheapest first).
export const nearestLockedAchievement = (
  lockedSlugs: readonly AchievementSlug[],
  stats: Partial<AchievementStats>,
): AchievementProgress | null => {
  const locked = new Set<AchievementSlug>(lockedSlugs);
  let best: AchievementProgress | null = null;
  for (const slug of ACHIEVEMENT_SLUGS) {
    if (!locked.has(slug)) continue;
    const progress = achievementProgress(slug, stats);
    if (!progress) continue;
    if (!best || progress.ratio > best.ratio) best = progress;
  }
  return best;
};
