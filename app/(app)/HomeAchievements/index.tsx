import type { JSX } from "react";
import { homeAchievementsCopy } from "./copy";
import * as styles from "./styles";

type Unlock = {
  slug: string;
  title: string;
  icon: string | null;
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
            {u.icon && <span className={styles.icon}>{u.icon}</span>}
            <span className={styles.title}>{u.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
