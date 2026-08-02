import type { JSX } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";
import { loginErrors, type LoginErrorCode } from "./LoginForm/copy";
import * as styles from "./styles";

// ?error= is whatever the address bar says, so it is untrusted input. It is
// matched against the codes the app defines and collapsed to "unknown"
// otherwise — the value itself is never rendered, only our own copy.
const toErrorCode = (raw: string | string[] | undefined): LoginErrorCode | null => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value === "") return null;
  // hasOwn, not `in`: `in` would happily match "toString".
  return Object.hasOwn(loginErrors, value) ? (value as LoginErrorCode) : "unknown";
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}): Promise<JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  // Set by /auth/callback when sign-in came back broken or cancelled.
  const { error } = await searchParams;

  return (
    <main className={styles.page}>
      <LoginForm initialError={toErrorCode(error)} />
    </main>
  );
}
