"use client";

// Install nudge for the home page. The offer itself lives in
// lib/pwa/installPrompt (module scope, so it survives navigation and the
// Profile screen can make the same offer later); this component only decides
// whether home should nag about it right now.
//
// Dismissing is still sticky, which is only acceptable now that Profile →
// "Add to home screen" is a permanent way back in.

import { useEffect, useState, type JSX } from "react";
import { Card } from "@/components/ui/Card";
import { promptInstall, useInstallOffer } from "@/lib/pwa/installPrompt";
import { installPromptCopy } from "./copy";
import * as styles from "./styles";

const DISMISS_KEY = "install-prompt-dismissed";

export const InstallPrompt = (): JSX.Element | null => {
  const offer = useInstallOffer();
  // Starts dismissed so SSR renders nothing: localStorage is browser-only,
  // and the set-state-in-effect rule is disabled because there is no
  // render-time path to read it.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(false);
  }, []);

  const onDismiss = (): void => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const onInstall = async (): Promise<void> => {
    await promptInstall();
  };

  if (dismissed || offer.installed) return null;
  // Nothing useful to say: no saved prompt, and no manual route worth
  // spelling out on a browser that never offered one.
  if (!offer.available && offer.platform !== "ios") return null;

  return (
    <Card variant="muted" size="sm" className={styles.card}>
      <div className={styles.row}>
        <div className={styles.text}>
          <p className={styles.kicker}>{installPromptCopy.kicker}</p>
          <p className={styles.body}>
            {offer.available ? installPromptCopy.body : installPromptCopy.iosBody}
          </p>
        </div>
        <div className={styles.actions}>
          {offer.available && (
            <button
              type="button"
              className={styles.installBtn}
              onClick={onInstall}
            >
              {installPromptCopy.install}
            </button>
          )}
          <button
            type="button"
            className={styles.dismissBtn}
            onClick={onDismiss}
            aria-label={installPromptCopy.dismissAria}
          >
            {installPromptCopy.dismiss}
          </button>
        </div>
      </div>
    </Card>
  );
};
