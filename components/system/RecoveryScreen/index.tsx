"use client";

// The one screen every dead end lands on: error boundaries, 404s and the
// offline fallback. Installed as a PWA there is no address bar, so a
// screen without a way out strands the user completely — this component
// exists so no route can ship without one.

import type { JSX } from "react";
import { Card } from "@/components/ui/Card";
import * as buttonStyles from "@/components/ui/Button/styles";
import { recoveryCopy, recoveryVariants } from "./copy";
import * as styles from "./styles";

export type RecoveryVariant = keyof typeof recoveryVariants;

type RecoveryScreenProps = {
  variant: RecoveryVariant;
  // "reload" re-attempts the current URL. That is the right retry for the
  // offline fallback, where the service worker served this document in
  // place of the page the user actually asked for — the address stayed
  // put, so a reload retries the real navigation.
  retry?: "reload" | (() => void);
  // Error digest, so a user can quote something matchable in a bug report.
  digest?: string | null;
};

export const RecoveryScreen = ({
  variant,
  retry,
  digest = null,
}: RecoveryScreenProps): JSX.Element => {
  const text = recoveryVariants[variant];

  const onRetry = (): void => {
    if (retry === "reload") {
      window.location.reload();
      return;
    }
    retry?.();
  };

  return (
    <main className={styles.page}>
      {/* Default (panel) card, not the plasma-gradient variant: plasma is
          for actions and identity, and breaking is neither. */}
      <Card className={styles.card}>
        <p className={styles.kicker}>{text.kicker}</p>
        <h1 className={styles.title}>{text.title}</h1>
        <p className={styles.body}>{text.body}</p>

        <div className={styles.actions}>
          {retry !== undefined && (
            <button
              type="button"
              onClick={onRetry}
              className={buttonStyles.variant.primary}
            >
              {recoveryCopy.retryLabel}
            </button>
          )}
          {/* A plain anchor, not next/link. next/link would work in the
              easy cases — it degrades to a browser navigation when the
              RSC fetch fails — but this component also renders inside
              global-error.tsx, which replaces the root layout when the
              root layout itself threw. The way out of a broken app must
              not route through the app. Hence the rule exemption: the
              full reload is the point, not an oversight. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className={styles.home}>
            {recoveryCopy.homeLabel}
          </a>
        </div>

        {digest !== null && digest !== "" && (
          <p className={styles.digest}>
            {recoveryCopy.referencePrefix} {digest}
          </p>
        )}
      </Card>
    </main>
  );
};
