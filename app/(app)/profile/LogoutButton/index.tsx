"use client";

import { useState, type JSX } from "react";
import { Button } from "@/components/ui/Button";
import { getDb } from "@/lib/db/dexie";
import { drainQueue } from "@/lib/db/queue";
import { signOut } from "../../actions";
import { logoutButtonCopy } from "./copy";
import * as styles from "./styles";

export const LogoutButton = (): JSX.Element => {
  const [pending, setPending] = useState(false);

  const onClick = async (): Promise<void> => {
    if (pending) return;
    setPending(true);
    // Push any queued writes first (best-effort), then wipe the local
    // mirror so the next account on this device doesn't inherit this
    // user's workouts, streak, and resume CTA.
    try {
      await drainQueue();
    } catch {
      // Offline — signing out is an explicit "I'm done on this device";
      // the wipe below intentionally abandons anything still unsynced.
    }
    try {
      await getDb().delete();
    } catch {
      // Never block sign-out on local cleanup.
    }
    await signOut();
  };

  return (
    <div className={styles.form}>
      <Button
        type="button"
        variant="destructive"
        className={styles.button}
        disabled={pending}
        onClick={() => void onClick()}
      >
        {pending ? logoutButtonCopy.pending : logoutButtonCopy.label}
      </Button>
    </div>
  );
};
