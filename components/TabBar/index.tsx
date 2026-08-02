"use client";

import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isTabBarVisible } from "./config";
import { tabBarCopy } from "./copy";
import * as styles from "./styles";

const HomeIcon = (): JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={styles.icon}
    aria-hidden
  >
    <path d="M3 11.5L12 4l9 7.5" />
    <path d="M5 10v10h14V10" />
  </svg>
);

const HistoryIcon = (): JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={styles.icon}
    aria-hidden
  >
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const ProfileIcon = (): JSX.Element => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={styles.icon}
    aria-hidden
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

const tabs = [
  { href: "/", label: tabBarCopy.home, Icon: HomeIcon },
  { href: "/history", label: tabBarCopy.history, Icon: HistoryIcon },
  { href: "/profile", label: tabBarCopy.profile, Icon: ProfileIcon },
] as const;

const isActive = (pathname: string, href: string): boolean => {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};

export const TabBar = (): JSX.Element | null => {
  const pathname = usePathname();
  // Same predicate drives the CTA clearance — see components/TabBar/config.
  if (!isTabBarVisible(pathname)) return null;

  return (
    <nav className={styles.nav} aria-label={tabBarCopy.ariaLabel}>
      {tabs.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={active ? styles.itemActive : styles.item}
            aria-current={active ? "page" : undefined}
          >
            <Icon />
            <span className={styles.label}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
