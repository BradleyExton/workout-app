import type { JSX } from "react";
import { BadgeGlyph } from "@/components/ui/BadgeGlyph";
import { homeAchievementsCopy } from "./copy";
import * as styles from "./styles";

type Unlock = {
  slug: string;
  title: string;
};

type HomeAchievementsProps = {
  unlocks: Unlock[];
};

export const HomeAchievements = ({
  unlocks,
}: HomeAchievementsProps): JSX.Element | null => {
  if (unlocks.length === 0) return null;
  return (
    <div className={styles.wrapper}>
      <p className={styles.kicker}>{homeAchievementsCopy.kicker}</p>
      <div className={styles.row}>
        {unlocks.map((u) => (
          <div key={u.slug} className={styles.badge}>
            <BadgeGlyph slug={u.slug} className={styles.icon} />
            <span className={styles.title}>{u.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
