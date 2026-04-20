"use client";

import { useState, type FormEvent, type JSX } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { loginCopy } from "./copy";
import * as styles from "./styles";

type Step = "email" | "code";
type Status = "idle" | "busy" | "error" | "invalidCode";

export const LoginForm = (): JSX.Element => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const sendCode = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStatus("busy");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setStatus("error");
      return;
    }

    setStatus("idle");
    setStep("code");
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStatus("busy");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setStatus("invalidCode");
      return;
    }

    window.location.href = "/";
  };

  const goBackToEmail = (): void => {
    setCode("");
    setStatus("idle");
    setStep("email");
  };

  if (step === "code") {
    const busy = status === "busy";
    return (
      <form className={styles.form} onSubmit={verifyCode}>
        <h1 className={styles.heading}>{loginCopy.heading}</h1>
        <p className={styles.subheading}>{loginCopy.sent}</p>

        <label className={styles.label}>
          {loginCopy.codeLabel}
          <input
            className={styles.codeInput}
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            placeholder={loginCopy.codePlaceholder}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            disabled={busy}
            autoFocus
          />
        </label>

        <Button type="submit" disabled={busy || code.length !== 6} aria-busy={busy}>
          {busy ? loginCopy.verifying : loginCopy.verify}
        </Button>

        <button type="button" className={styles.changeEmail} onClick={goBackToEmail} disabled={busy}>
          {loginCopy.changeEmail}
        </button>

        <div role="status" aria-live="polite" className={styles.liveRegion}>
          {status === "invalidCode" && <p className={styles.error}>{loginCopy.invalidCode}</p>}
        </div>
      </form>
    );
  }

  const busy = status === "busy";
  return (
    <form className={styles.form} onSubmit={sendCode}>
      <h1 className={styles.heading}>{loginCopy.heading}</h1>
      <p className={styles.subheading}>{loginCopy.subheading}</p>

      <label className={styles.label}>
        {loginCopy.emailLabel}
        <input
          className={styles.input}
          type="email"
          required
          autoComplete="email"
          placeholder={loginCopy.emailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={busy}
        />
      </label>

      <Button type="submit" disabled={busy} aria-busy={busy}>
        {busy ? loginCopy.submitting : loginCopy.submit}
      </Button>

      <div role="status" aria-live="polite" className={styles.liveRegion}>
        {status === "error" && <p className={styles.error}>{loginCopy.error}</p>}
      </div>
    </form>
  );
};
