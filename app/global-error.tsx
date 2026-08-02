"use client"; // Error boundaries must be Client Components.

// Last resort: this replaces the root layout when the root layout itself
// throws, so it has to bring its own document shell, global styles and
// font — nothing from app/layout.tsx is on screen when this renders.
// metadata/generateMetadata are unavailable in a Client Component, hence
// React's <title>.

import { Baloo_2 } from "next/font/google";
import type { JSX } from "react";
import { RecoveryScreen } from "@/components/system/RecoveryScreen";
import { globalErrorCopy } from "./globalErrorCopy";
import "./globals.css";

const baloo = Baloo_2({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-baloo",
  display: "swap",
});

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}): JSX.Element {
  return (
    <html lang="en" className={`${baloo.variable} h-full antialiased`}>
      <body className="min-h-full">
        <title>{globalErrorCopy.title}</title>
        <RecoveryScreen
          variant="globalError"
          retry={unstable_retry}
          digest={error.digest ?? null}
        />
      </body>
    </html>
  );
}
