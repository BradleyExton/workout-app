"use client";

// Surfaces a stuck write queue. Normally sync is invisible (⏳ → ✓ on
// set rows); this chip only appears once an op has failed repeatedly,
// so "it'll sync later" never silently becomes "it never synced".

import { useState, type JSX } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/dexie";
import { drainQueue } from "@/lib/db/queue";
import { syncChipCopy } from "./copy";
import * as styles from "./styles";

const STUCK_AFTER_ATTEMPTS = 3;

export const SyncStatusChip = (): JSX.Element | null => {
  const [retrying, setRetrying] = useState(false);

  const stuckCount = useLiveQuery(
    () =>
      getDb()
        .pending_ops.filter(
          (op) => op.synced_at === null && op.attempts >= STUCK_AFTER_ATTEMPTS,
        )
        .count(),
    [],
    0,
  );

  if (!stuckCount) return null;

  const onRetry = async (): Promise<void> => {
    if (retrying) return;
    setRetrying(true);
    try {
      await drainQueue();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <button
      type="button"
      className={styles.chip}
      onClick={() => void onRetry()}
      disabled={retrying}
      aria-busy={retrying}
    >
      {retrying ? syncChipCopy.retrying : syncChipCopy.stuck(stuckCount)}
    </button>
  );
};
