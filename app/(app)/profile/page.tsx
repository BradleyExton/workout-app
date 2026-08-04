import type { JSX } from "react";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import {
  ACHIEVEMENT_REQUIREMENTS,
  isAchievementSlug,
  nearestLockedAchievement,
} from "@/lib/domain/achievements";
import { InstallAppRow } from "./InstallAppRow";
import { LogoutButton } from "./LogoutButton";
import { profileCopy } from "./copy";
import * as styles from "./styles";

// TODO(xp): this screen used to show a hardcoded "LV 1" chip and a 35/100 XP
// bar for an economy that doesn't exist yet. Both are gone; the slot now
// shows real progress toward the next badge. When the XP phase lands (level N
// needs 100 × N XP, derived from sets / workouts / cardio_sessions /
// user_achievements — no new table), the level chip and XP bar come back here
// driven by real totals.

type AchievementRow = {
  id: string;
  slug: string;
  title: string;
  icon: string | null;
};

const deriveName = (email: string | null | undefined): string => {
  if (!email) return profileCopy.fallbackName;
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? "";
  if (!first) return profileCopy.fallbackName;
  return first.charAt(0).toUpperCase() + first.slice(1);
};

const formatSince = (createdAt: string | undefined): string | null => {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const conditionFor = (slug: string): string | null => {
  if (!isAchievementSlug(slug)) return null;
  const { metric, threshold } = ACHIEVEMENT_REQUIREMENTS[slug];
  return profileCopy.badgeCondition(metric, threshold);
};

const LockIcon = (): JSX.Element => (
  <svg viewBox="0 0 24 24" fill="none" className={styles.badgeLockIcon} aria-hidden>
    <rect x="6" y="10" width="12" height="9" rx="2" fill="currentColor" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export default async function ProfilePage(): Promise<JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { count: workoutCount },
    { count: cardioCount },
    { count: prCount },
    { data: achievements },
    { data: unlockRows },
  ] = await Promise.all([
    supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .not("finished_at", "is", null),
    supabase.from("cardio_sessions").select("id", { count: "exact", head: true }),
    // Cheap enough to fetch here, and it unlocks progress for the PR badges.
    // Streak / muscle-group / lifetime-volume stats are deliberately not
    // measured on this screen — they'd cost a full scan of `sets`.
    supabase.from("personal_records").select("id", { count: "exact", head: true }),
    supabase.from("achievements").select("id, slug, title, icon").order("slug"),
    supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .order("unlocked_at", { ascending: false }),
  ]);

  const catalogue = (achievements ?? []) as AchievementRow[];
  const unlocks = unlockRows ?? [];
  const unlockedIds = new Set(unlocks.map((u) => u.achievement_id));
  const latestUnlockId = unlocks[0]?.achievement_id ?? null;

  // Unlocked badges lead the case; locked ones fill out the rest of the grid.
  const badges = [
    ...catalogue.filter((a) => unlockedIds.has(a.id)),
    ...catalogue.filter((a) => !unlockedIds.has(a.id)),
  ];

  const lockedSlugs = catalogue
    .filter((a) => !unlockedIds.has(a.id))
    .map((a) => a.slug)
    .filter(isAchievementSlug);

  // Only the metrics this page actually measured go in — the rest stay
  // absent so no badge gets a fabricated "0 / 10".
  const nextBadge = nearestLockedAchievement(lockedSlugs, {
    workoutsFinished: workoutCount ?? 0,
    prCount: prCount ?? 0,
  });
  const nextBadgeRow = nextBadge
    ? (catalogue.find((a) => a.slug === nextBadge.slug) ?? null)
    : null;
  // Nothing measurable left to chase: either the case is complete, or the
  // only badges left run on stats this screen doesn't compute. Fall back to
  // the first locked badge so the slot still points somewhere real.
  const fallbackLocked =
    !nextBadgeRow && lockedSlugs.length > 0
      ? (catalogue.find(
          (a) => !unlockedIds.has(a.id) && isAchievementSlug(a.slug),
        ) ?? null)
      : null;
  const targetRow = nextBadgeRow ?? fallbackLocked;
  const targetCondition = targetRow ? conditionFor(targetRow.slug) : null;

  const displayName = deriveName(user?.email);
  const since = formatSince(user?.created_at);

  return (
    <main className={styles.page}>
      <h1 className={styles.srTitle}>{profileCopy.title}</h1>

      <div className={styles.identity}>
        <div className={styles.avatar}>
          <span className={styles.avatarMonogram}>
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className={styles.identityText}>
          <span className={styles.name}>{displayName}</span>
          {user?.email && <span className={styles.email}>{user.email}</span>}
          {since && (
            <span className={styles.since}>{profileCopy.playingSince(since)}</span>
          )}
        </div>
      </div>

      {catalogue.length > 0 && (
        <div className={styles.nextBlock}>
          <div className={styles.nextLabelRow}>
            <span>{profileCopy.nextBadgeKicker}</span>
            {nextBadge && (
              <span className={styles.nextValue}>
                {profileCopy.nextBadgeProgress(
                  nextBadge.current,
                  nextBadge.threshold,
                )}
              </span>
            )}
          </div>
          <div className={styles.nextTarget}>
            <span className={styles.nextIcon} aria-hidden>
              {targetRow
                ? (targetRow.icon ?? "🏅")
                : profileCopy.nextBadgeAllDoneIcon}
            </span>
            <span className={targetRow ? styles.nextName : styles.nextNameDone}>
              {targetRow ? targetRow.title : profileCopy.nextBadgeAllDone}
            </span>
          </div>
          {nextBadge && (
            <div
              className={styles.nextTrack}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={nextBadge.threshold}
              aria-valuenow={nextBadge.current}
              aria-label={profileCopy.nextBadgeKicker}
            >
              <div
                className={styles.nextFill}
                style={{ width: `${Math.round(nextBadge.ratio * 100)}%` }}
              />
            </div>
          )}
          {targetCondition && (
            <p className={styles.nextCondition}>{targetCondition}</p>
          )}
          <p className={styles.nextNote}>{profileCopy.xpSoonNote}</p>
        </div>
      )}

      <div className={styles.statsRow}>
        <Card variant="panel" size="sm" className={styles.statCard}>
          <p className={styles.statLabel}>{profileCopy.statWorkouts}</p>
          <p
            className={
              (workoutCount ?? 0) === 0 ? styles.statValueZero : styles.statValue
            }
          >
            {workoutCount ?? 0}
          </p>
        </Card>
        <Card variant="panel" size="sm" className={styles.statCard}>
          <p className={styles.statLabel}>{profileCopy.statCardio}</p>
          <p
            className={
              (cardioCount ?? 0) === 0 ? styles.statValueZero : styles.statValue
            }
          >
            {cardioCount ?? 0}
          </p>
        </Card>
        <Card variant="panel" size="sm" className={styles.statCard}>
          <p className={styles.statLabel}>{profileCopy.statBadges}</p>
          <p
            className={
              unlockedIds.size === 0 ? styles.statValueZero : styles.statValue
            }
          >
            {unlockedIds.size}
          </p>
        </Card>
      </div>

      <Card variant="panel" className={styles.trophyCard}>
        <p className={styles.trophyKicker}>
          {profileCopy.trophyCase(unlockedIds.size, catalogue.length)}
        </p>
        {badges.length === 0 ? (
          <p className={styles.trophyEmpty}>{profileCopy.trophyEmpty}</p>
        ) : (
          <ul className={styles.trophyGrid}>
            {badges.map((badge) => {
              const unlocked = unlockedIds.has(badge.id);
              const isLatest = unlocked && badge.id === latestUnlockId;
              const tone = !unlocked
                ? styles.tileLocked
                : isLatest
                  ? styles.tileLatest
                  : styles.tileUnlocked;
              const medalTone = !unlocked
                ? styles.medalLocked
                : isLatest
                  ? styles.medalLatest
                  : styles.medalUnlocked;
              const condition = unlocked ? null : conditionFor(badge.slug);
              return (
                <li key={badge.id} className={`${styles.tileBase} ${tone}`}>
                  <span className={`${styles.medalBase} ${medalTone}`}>
                    {unlocked ? (
                      <span aria-hidden>{badge.icon ?? "🏅"}</span>
                    ) : (
                      <LockIcon />
                    )}
                  </span>
                  <span
                    className={unlocked ? styles.badgeName : styles.badgeNameLocked}
                  >
                    {badge.title}
                  </span>
                  {/* Sighted users read the lock glyph and the dimmed tile;
                      this carries the same state to screen readers. */}
                  <span className={styles.srOnly}>
                    {unlocked
                      ? profileCopy.badgeUnlockedState
                      : profileCopy.badgeLockedState}
                  </span>
                  {condition && (
                    <span className={styles.badgeCondition}>{condition}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <InstallAppRow />

      <div className={styles.signOutZone}>
        <LogoutButton />
      </div>
    </main>
  );
}
