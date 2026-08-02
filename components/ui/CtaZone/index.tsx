"use client";

// The fixed strip that floats the primary action over the bottom of a screen.
//
// Its one variable is whether the tab bar is under it, and that answer comes
// from `isTabBarVisible` — the same predicate the bar uses to decide whether
// to render at all. Server components can hand it children; only the offset
// needs the pathname.

import type { JSX } from "react";
import { usePathname } from "next/navigation";
import { isTabBarVisible } from "@/components/TabBar/config";
import * as styles from "./styles";

type CtaZoneProps = {
  children: React.ReactNode;
};

export const CtaZone = ({ children }: CtaZoneProps): JSX.Element => {
  const pathname = usePathname();
  return (
    <div className={isTabBarVisible(pathname) ? styles.zoneAboveTabBar : styles.zone}>
      {children}
    </div>
  );
};
