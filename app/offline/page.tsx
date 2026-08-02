import type { JSX } from "react";
import { RecoveryScreen } from "@/components/system/RecoveryScreen";

export const metadata = {
  title: "Offline · Workout",
};

// The service worker serves this document *in place of* whatever page the
// user asked for, leaving the address bar on the original URL — so
// "Try again" is a plain reload, which re-attempts that real navigation.
// Copy and styling now live with RecoveryScreen, shared with the error
// boundaries and the 404.
export default function OfflinePage(): JSX.Element {
  return <RecoveryScreen variant="offline" retry="reload" />;
}
