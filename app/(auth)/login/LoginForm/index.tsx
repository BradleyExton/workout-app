"use client";

import { useState, type FormEvent, type JSX } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { loginCopy } from "./copy";
import * as styles from "./styles";

type Status = "idle" | "sending" | "sent" | "error";

export const LoginForm = (): JSX.Element => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStatus("sending");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setStatus(error ? "error" : "sent");
  };

  const locked = status === "sending" || status === "sent";

  return (
    <form className={styles.form} onSubmit={onSubmit}>
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
          disabled={locked}
        />
      </label>

      <Button type="submit" disabled={locked}>
        {status === "sending" ? loginCopy.submitting : loginCopy.submit}
      </Button>

      {status === "sent" && <p className={styles.message}>{loginCopy.success}</p>}
      {status === "error" && <p className={styles.error}>{loginCopy.error}</p>}
    </form>
  );
};
