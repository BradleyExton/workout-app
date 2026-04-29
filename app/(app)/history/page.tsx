import type { JSX } from "react";
import { historyCopy } from "./copy";
import * as styles from "./styles";

export default function HistoryPage(): JSX.Element {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{historyCopy.title}</h1>
      <p className={styles.note}>{historyCopy.comingSoon}</p>
    </main>
  );
}
