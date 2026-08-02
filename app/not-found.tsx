import type { JSX } from "react";
import { RecoveryScreen } from "@/components/system/RecoveryScreen";

// The root not-found also serves every unmatched URL in the app, so this
// is the screen a mistyped or stale deep link lands on. No retry — the
// URL is not going to start existing — just the way home.
export const metadata = {
  title: "Not found · Workout",
};

export default function NotFound(): JSX.Element {
  return <RecoveryScreen variant="notFound" />;
}
