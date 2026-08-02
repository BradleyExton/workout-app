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
      {/* Default (panel) card, not the plasma-gradient `lime` variant:
          plasma is for actions and identity, and losing the network is
          neither. */}
      <Card className={styles.card}>
        <p className={styles.kicker}>{offlineCopy.kicker}</p>
        <h1 className={styles.title}>{offlineCopy.title}</h1>
        <p className={styles.body}>{offlineCopy.body}</p>
      </Card>
    </main>
  );
}
