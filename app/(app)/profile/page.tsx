import type { JSX } from "react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./LogoutButton";
import { profileCopy } from "./copy";
import * as styles from "./styles";

export default async function ProfilePage(): Promise<JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{profileCopy.title}</h1>
      <div className={styles.section}>
        <span className={styles.label}>{profileCopy.signedInAs}</span>
        <span className={styles.email}>{user?.email ?? ""}</span>
      </div>
      <LogoutButton />
    </main>
  );
}
