"use client";

// The way back to the install offer.
//
// Home's nudge can be dismissed, and that dismissal is permanent — before
// this row existed there was no second chance at "add to home screen".
// Profile is where a setting like that belongs anyway.
//
// Three cases, all handled by one button:
//   - a saved `beforeinstallprompt` is available → fire the native prompt;
//   - no saved prompt (iOS always; Chrome once the event is spent or was
//     never fired) → show the manual steps for that platform;
//   - already installed / running standalone → the row isn't rendered.

import { useState, type JSX } from "react";
import { Card } from "@/components/ui/Card";
import { promptInstall, useInstallOffer } from "@/lib/pwa/installPrompt";
import { installAppRowCopy } from "./copy";
import * as styles from "./styles";

export const InstallAppRow = (): JSX.Element | null => {
  const offer = useInstallOffer();
  const [showSteps, setShowSteps] = useState(false);

  if (offer.installed) return null;

  const onTap = async (): Promise<void> => {
    if (!offer.available) {
      setShowSteps((open) => !open);
      return;
    }
    // "unavailable" means the event went stale between render and tap —
    // fall through to the instructions rather than leaving a dead button.
    const outcome = await promptInstall();
    if (outcome === "unavailable") setShowSteps(true);
  };

  return (
    <Card variant="panel" size="sm" className={styles.card}>
      <p className={styles.kicker}>{installAppRowCopy.kicker}</p>
      <p className={styles.body}>{installAppRowCopy.body}</p>
      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.installBtn}
          onClick={onTap}
          aria-expanded={offer.available ? undefined : showSteps}
        >
          {installAppRowCopy.action}
        </button>
      </div>
      {showSteps && (
        <div className={styles.steps}>
          <p className={styles.stepsHeading}>{installAppRowCopy.stepsHeading}</p>
          <p className={styles.stepsBody}>
            {offer.platform === "ios"
              ? installAppRowCopy.stepsIos
              : installAppRowCopy.stepsOther}
          </p>
        </div>
      )}
    </Card>
  );
};
