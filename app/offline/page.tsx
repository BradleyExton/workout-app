import type { JSX } from "react";
import { Card } from "@/components/ui/Card";
import { offlineCopy } from "./copy";
import * as styles from "./styles";

export const metadata = {
  title: "Offline · Workout",
};

export default function OfflinePage(): JSX.Element {
  return (
    <main className={styles.page}>
      <Card variant="lime" className={styles.card}>
        <p className={styles.kicker}>{offlineCopy.kicker}</p>
        <h1 className={styles.title}>{offlineCopy.title}</h1>
        <p className={styles.body}>{offlineCopy.body}</p>
      </Card>
    </main>
  );
}
