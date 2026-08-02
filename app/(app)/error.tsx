"use client"; // Error boundaries must be Client Components.

// Route-group boundary. error.tsx wraps its segment's pages but not the
// layout above it, so this renders *inside* app/(app)/layout.tsx — the
// tab bar survives and the user keeps their normal navigation. Worth
// having separately from the root boundary for exactly that reason.

import { useEffect, type JSX } from "react";
import { RecoveryScreen } from "@/components/system/RecoveryScreen";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}): JSX.Element {
  useEffect(() => {
    console.error("[app/(app)/error]", error);
  }, [error]);

  return (
    <RecoveryScreen
      variant="error"
      retry={unstable_retry}
      digest={error.digest ?? null}
    />
  );
}
