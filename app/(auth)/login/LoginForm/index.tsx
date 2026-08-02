"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { loginCopy, loginErrors, type LoginErrorCode } from "./copy";
import * as styles from "./styles";

type Status = "idle" | "redirecting";

// How long "Redirecting…" is allowed to sit there before the button gives
// itself back. Signing in is a full-page hand-off to Google: once
// signInWithOAuth resolves the navigation starts within a few hundred ms,
// so 15s is roughly ten slow-network round trips — far past any honest
// redirect, and still inside the window where the user is watching and
// willing to retry rather than force-quitting the app.
const REDIRECT_TIMEOUT_MS = 15_000;

const GoogleIcon = (): JSX.Element => (
  <span className={styles.googleIconWrap}>
    <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  </span>
);

type LoginFormProps = {
  // Resolved by the page from ?error=, already narrowed to a known code.
  initialError?: LoginErrorCode | null;
};

export const LoginForm = ({
  initialError = null,
}: LoginFormProps): JSX.Element => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorCode, setErrorCode] = useState<LoginErrorCode | null>(
    initialError,
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRedirectTimer = useCallback((): void => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    // Backing out of Google's consent screen restores this page from the
    // bfcache with its React state intact — including a "Redirecting…"
    // button for a redirect that already came and went. Hand the button
    // back, silently: the user chose to come back, nothing failed.
    const onPageShow = (event: PageTransitionEvent): void => {
      if (!event.persisted) return;
      clearRedirectTimer();
      setStatus("idle");
    };

    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      clearRedirectTimer();
    };
  }, [clearRedirectTimer]);

  const onClick = async (): Promise<void> => {
    // Whatever went wrong last time is now history — clear it before the
    // retry so a stale message doesn't sit under a live attempt.
    clearRedirectTimer();
    setErrorCode(null);
    setStatus("redirecting");

    // If the hand-off to Google never happens — blocked pop-up or
    // redirect, an in-app browser, a wedged network — nothing else will
    // ever move this button off "Redirecting…". This is the escape.
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setStatus("idle");
      setErrorCode("timeout");
    }, REDIRECT_TIMEOUT_MS);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      clearRedirectTimer();
      setStatus("idle");
      setErrorCode("start");
    }
  };

  const busy = status === "redirecting";

  return (
    <Card className={styles.panel}>
      <p className={styles.kicker}>{loginCopy.kicker}</p>
      <h1 className={styles.heading}>{loginCopy.heading}</h1>
      <p className={styles.subheading}>{loginCopy.subheading}</p>

      <Button
        variant="primary"
        className={styles.cta}
        onClick={onClick}
        disabled={busy}
        aria-busy={busy}
      >
        <GoogleIcon />
        {busy ? loginCopy.submitting : loginCopy.submit}
      </Button>

      <div role="status" aria-live="polite" className={styles.liveRegion}>
        {errorCode !== null && (
          <p className={styles.error}>{loginErrors[errorCode]}</p>
        )}
      </div>
    </Card>
  );
};
