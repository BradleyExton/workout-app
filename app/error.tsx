"use client"; // Error boundaries must be Client Components.

// Root boundary: catches anything thrown outside the (app) group (login,
// /offline) and anything thrown by the (app) layout itself. Errors inside
// (app) pages are caught one level down by app/(app)/error.tsx, which
// keeps the tab bar on screen.

import { useEffect, type JSX } from "react";
import { RecoveryScreen } from "@/components/system/RecoveryScreen";

export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}): JSX.Element {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <RecoveryScreen
      variant="error"
      retry={unstable_retry}
      digest={error.digest ?? null}
    />
  );
}
