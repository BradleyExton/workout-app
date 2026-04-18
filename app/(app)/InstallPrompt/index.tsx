"use client";

// Install nudge for the home page. Two paths:
//   - Browsers that fire `beforeinstallprompt` (Chrome, Edge, Android):
//     stash the event, render a button that triggers the native prompt.
//   - iOS Safari (no event support): when not already in standalone mode,
//     render a hint with the share-sheet instruction.
// Hidden once the user installs, dismisses, or visits as an installed PWA.

import { useEffect, useState, type JSX } from "react";
import { Card } from "@/components/ui/Card";
import { installPromptCopy } from "./copy";
import * as styles from "./styles";

const DISMISS_KEY = "install-prompt-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
};

const isIosSafari = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
};

export const InstallPrompt = (): JSX.Element | null => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Canonical browser-only hydration: SSR renders nothing (dismissed
    // defaults true), the effect refines once we have access to
    // window/localStorage. The set-state-in-effect rule is disabled
    // because there's no render-time path to read these values.
    if (isStandalone()) return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(false);
    setShowIosHint(isIosSafari());

    const onBeforeInstall = (event: Event): void => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = (): void => {
      setDeferred(null);
      setShowIosHint(false);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const onDismiss = (): void => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const onInstall = async (): Promise<void> => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setDeferred(null);
  };

  if (dismissed) return null;
  if (!deferred && !showIosHint) return null;

  return (
    <Card variant="cream" size="sm" className={styles.card}>
      <div className={styles.row}>
        <div className={styles.text}>
          <p className={styles.kicker}>{installPromptCopy.kicker}</p>
          <p className={styles.body}>
            {showIosHint ? installPromptCopy.iosBody : installPromptCopy.body}
          </p>
        </div>
        <div className={styles.actions}>
          {deferred && (
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
