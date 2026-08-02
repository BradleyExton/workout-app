import type { JSX } from "react";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./LogoutButton";
import { profileCopy } from "./copy";
import * as styles from "./styles";

// TODO(xp): level number is a hardcoded placeholder. The XP economy phase
// derives it from existing rows (sets / workouts / cardio_sessions /
// user_achievements) — level N needs 100 × N XP. No new table, no new query.
const PLACEHOLDER_LEVEL = 1;

// TODO(xp): XP progress-bar fill is a hardcoded placeholder for the same
// reason — replace with (totalXp - levelFloor) / levelSpan once XP exists.
const PLACEHOLDER_XP_CURRENT = 35;
const PLACEHOLDER_XP_NEXT = 100;
const PLACEHOLDER_XP_PCT = 35;

type AchievementRow = {
  id: string;
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
    { data: achievements },
    { data: unlockRows },
  ] = await Promise.all([
    supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .not("finished_at", "is", null),
    supabase.from("cardio_sessions").select("id", { count: "exact", head: true }),
    supabase.from("achievements").select("id, title, icon").order("slug"),
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

  const displayName = deriveName(user?.email);
  const since = formatSince(user?.created_at);

  return (
    <main className={styles.page}>
      <h1 className={styles.srTitle}>{profileCopy.title}</h1>

      <div className={styles.identity}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            <span className={styles.avatarMonogram}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className={styles.levelChip}>
            <span className={styles.levelKicker}>{profileCopy.levelKicker}</span>
            <span className={styles.levelValue}>{PLACEHOLDER_LEVEL}</span>
          </div>
        </div>
        <div className={styles.identityText}>
          <span className={styles.name}>{displayName}</span>
          {user?.email && <span className={styles.email}>{user.email}</span>}
          {since && (
            <span className={styles.since}>{profileCopy.playingSince(since)}</span>
          )}
        </div>
      </div>

      <div className={styles.xpBlock}>
        <div className={styles.xpLabelRow}>
          <span>{profileCopy.xpLabel}</span>
          <span className={styles.xpValue}>
            {profileCopy.xpValue(PLACEHOLDER_XP_CURRENT, PLACEHOLDER_XP_NEXT)}
          </span>
        </div>
        <div className={styles.xpTrack}>
          {/* TODO(xp): placeholder width — drive from real XP totals. */}
          <div className={styles.xpFill} style={{ width: `${PLACEHOLDER_XP_PCT}%` }} />
        </div>
        <p className={styles.xpNote}>{profileCopy.xpPreviewNote}</p>
      </div>

      <div className={styles.statsRow}>
        <Card variant="panel" size="sm" className={styles.statCard}>
          <p className={styles.statLabel}>{profileCopy.statWorkouts}</p>
          <p className={styles.statValue}>{workoutCount ?? 0}</p>
        </Card>
        <Card variant="panel" size="sm" className={styles.statCard}>
          <p className={styles.statLabel}>{profileCopy.statCardio}</p>
          <p className={styles.statValue}>{cardioCount ?? 0}</p>
        </Card>
        <Card variant="panel" size="sm" className={styles.statCard}>
          <p className={styles.statLabel}>{profileCopy.statBadges}</p>
          <p className={styles.statValue}>{unlockedIds.size}</p>
        </Card>
      </div>

      <Card variant="panel" className={styles.trophyCard}>
        <p className={styles.trophyKicker}>
          {profileCopy.trophyCase(unlockedIds.size, catalogue.length)}
        </p>
        {badges.length === 0 ? (
          <p className={styles.trophyEmpty}>{profileCopy.trophyEmpty}</p>
        ) : (
          <div className={styles.trophyGrid}>
            {badges.map((badge) => {
              const unlocked = unlockedIds.has(badge.id);
              const tone = !unlocked
                ? styles.badgeLocked
                : badge.id === latestUnlockId
                  ? styles.badgeLatest
                  : styles.badgeUnlocked;
              return (
                <div
                  key={badge.id}
                  className={`${styles.badgeBase} ${tone}`}
                  aria-label={
                    unlocked
                      ? profileCopy.badgeUnlockedLabel(badge.title)
                      : profileCopy.badgeLockedLabel(badge.title)
                  }
                  title={
                    unlocked
                      ? profileCopy.badgeUnlockedLabel(badge.title)
                      : profileCopy.badgeLockedLabel(badge.title)
                  }
                >
                  {unlocked ? (
                    <span aria-hidden>{badge.icon ?? "🏅"}</span>
                  ) : (
                    <LockIcon />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className={styles.signOutZone}>
        <LogoutButton />
      </div>
    </main>
  );
}
