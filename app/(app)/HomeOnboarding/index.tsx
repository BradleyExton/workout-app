import type { JSX } from "react";
import { Card } from "@/components/ui/Card";
import { homeOnboardingCopy } from "./copy";
import * as styles from "./styles";

export const HomeOnboarding = (): JSX.Element => {
  return (
    <Card variant="plasma" className={styles.card}>
      <span className={styles.kicker}>{homeOnboardingCopy.kicker}</span>
      <h2 className={styles.title}>{homeOnboardingCopy.title}</h2>
      <p className={styles.body}>{homeOnboardingCopy.body}</p>
    </Card>
  );
};
